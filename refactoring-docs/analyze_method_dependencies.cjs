#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * editorStore.ts 내부 메서드 간 의존성 분석 도구
 * 
 * 분석 항목:
 * 1. 내부 호출 관계 매핑
 * 2. 공통 헬퍼 함수 식별  
 * 3. 의존성 그래프 생성
 * 4. 통계 정보 제공
 */

class MethodDependencyAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.fileContent = '';
    this.methods = new Map(); // 메서드명 -> {startLine, endLine, content}
    this.dependencies = new Map(); // 메서드명 -> 호출하는 메서드들
    this.reverseDependencies = new Map(); // 메서드명 -> 이 메서드를 호출하는 메서드들
    this.helperMethods = new Set(); // 헬퍼 메서드들 (이름이 _로 시작)
    this.publicMethods = new Set(); // 공개 메서드들
  }

  /**
   * 파일 내용 로드
   */
  loadFile() {
    try {
      this.fileContent = fs.readFileSync(this.filePath, 'utf8');
      console.log(`✅ 파일 로드 완료: ${this.filePath}`);
    } catch (error) {
      console.error(`❌ 파일 로드 실패: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 메서드 정의 추출 및 범위 계산
   */
  extractMethodDefinitions() {
    console.log('🔍 메서드 정의 추출 중...');
    
    const lines = this.fileContent.split('\n');
    const methodPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(methodPattern);
      
      if (match) {
        const methodName = match[1];
        const startLine = i + 1;
        const endLine = this.findMethodEndLine(lines, i);
        const content = lines.slice(i, endLine).join('\n');
        
        this.methods.set(methodName, {
          startLine,
          endLine,
          content
        });
        
        // 헬퍼 메서드 분류
        if (methodName.startsWith('_')) {
          this.helperMethods.add(methodName);
        } else {
          this.publicMethods.add(methodName);
        }
      }
    }
    
    console.log(`📝 총 ${this.methods.size}개 메서드 발견 (공개: ${this.publicMethods.size}, 헬퍼: ${this.helperMethods.size})`);
  }

  /**
   * 메서드의 끝 라인 찾기 (개선된 중괄호 매칭)
   */
  findMethodEndLine(lines, startLineIndex) {
    let braceCount = 0;
    let inArrowFunction = false;
    let foundFirstBrace = false;
    
    for (let i = startLineIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // 화살표 함수 시작 확인
      if (line.includes('=>') && !inArrowFunction) {
        inArrowFunction = true;
      }
      
      if (inArrowFunction) {
        // 중괄호 카운팅
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prevChar = j > 0 ? line[j-1] : '';
          const nextChar = j < line.length - 1 ? line[j+1] : '';
          
          // 문자열이나 주석 내부의 중괄호는 무시
          if (this.isInStringOrComment(line, j)) continue;
          
          if (char === '{') {
            braceCount++;
            foundFirstBrace = true;
          } else if (char === '}') {
            braceCount--;
            
            // 첫 번째 중괄호를 찾은 후 브레이스 카운트가 0이 되면 메서드 끝
            if (foundFirstBrace && braceCount === 0) {
              return i + 1;
            }
          }
        }
      }
    }
    
    return lines.length; // 못 찾으면 파일 끝
  }

  /**
   * 문자열이나 주석 내부인지 확인 (간단한 버전)
   */
  isInStringOrComment(line, position) {
    const beforePosition = line.substring(0, position);
    
    // 간단한 문자열 검사 (완벽하지 않지만 기본적인 경우 처리)
    const singleQuoteCount = (beforePosition.match(/'/g) || []).length;
    const doubleQuoteCount = (beforePosition.match(/"/g) || []).length;
    const backtickCount = (beforePosition.match(/`/g) || []).length;
    
    // 홀수개면 문자열 내부
    if (singleQuoteCount % 2 === 1 || doubleQuoteCount % 2 === 1 || backtickCount % 2 === 1) {
      return true;
    }
    
    // 주석 검사
    if (beforePosition.includes('//')) {
      return true;
    }
    
    return false;
  }

  /**
   * 메서드 호출 관계 분석
   */
  analyzeDependencies() {
    console.log('🔗 메서드 간 의존성 분석 중...');
    
    for (const [methodName, methodInfo] of this.methods) {
      const dependencies = this.findMethodCallsInContent(methodInfo.content);
      this.dependencies.set(methodName, dependencies);
      
      // 역방향 의존성 구축
      for (const calledMethod of dependencies) {
        if (!this.reverseDependencies.has(calledMethod)) {
          this.reverseDependencies.set(calledMethod, new Set());
        }
        this.reverseDependencies.get(calledMethod).add(methodName);
      }
    }
    
    console.log('✅ 의존성 분석 완료');
  }

  /**
   * 메서드 내용에서 get().method() 패턴 찾기
   */
  findMethodCallsInContent(content) {
    const dependencies = new Set();
    const pattern = /get\(\)\.([a-zA-Z_][a-zA-Z0-9_]*)\(/g;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const calledMethod = match[1];
      if (this.methods.has(calledMethod)) {
        dependencies.add(calledMethod);
      }
    }
    
    return dependencies;
  }

  /**
   * 공통 헬퍼 함수 식별 (3번 이상 호출되는 함수)
   */
  identifyCommonHelpers() {
    console.log('🔧 공통 헬퍼 함수 식별 중...');
    
    const usageCounts = new Map();
    
    for (const [, dependencies] of this.dependencies) {
      for (const dep of dependencies) {
        usageCounts.set(dep, (usageCounts.get(dep) || 0) + 1);
      }
    }
    
    const commonHelpers = new Map();
    for (const [method, count] of usageCounts) {
      if (count >= 3) { // 3번 이상 사용되면 공통 헬퍼로 간주
        commonHelpers.set(method, count);
      }
    }
    
    return commonHelpers;
  }

  /**
   * 분석 결과 생성
   */
  generateReport() {
    console.log('📊 분석 리포트 생성 중...');
    
    const commonHelpers = this.identifyCommonHelpers();
    const timestamp = new Date().toISOString();
    
    let report = `# editorStore.ts 메서드 의존성 분석 리포트\n\n`;
    report += `**생성 시간:** ${timestamp}\n`;
    report += `**분석 파일:** ${this.filePath}\n\n`;
    
    // 1. 요약 통계
    report += `## 📊 요약 통계\n\n`;
    report += `- **총 메서드 수:** ${this.methods.size}\n`;
    report += `- **공개 메서드:** ${this.publicMethods.size}\n`;
    report += `- **헬퍼 메서드:** ${this.helperMethods.size}\n`;
    report += `- **공통 헬퍼 함수:** ${commonHelpers.size}\n\n`;
    
    // 2. 공통 헬퍼 함수 목록
    report += `## 🔧 공통 헬퍼 함수 (3회 이상 사용)\n\n`;
    const sortedCommonHelpers = Array.from(commonHelpers.entries())
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedCommonHelpers.length > 0) {
      for (const [method, count] of sortedCommonHelpers) {
        const callers = Array.from(this.reverseDependencies.get(method) || []);
        report += `### \`${method}\` (${count}회 사용)\n`;
        report += `**사용하는 메서드들:** ${callers.join(', ')}\n\n`;
      }
    } else {
      report += `공통 헬퍼 함수가 발견되지 않았습니다.\n\n`;
    }
    
    // 3. 도메인별 메서드 분류 (의존성 정보 포함)
    report += `## 🏗️ 도메인별 메서드 분류\n\n`;
    const domains = this.classifyMethodsByDomain();
    for (const [domain, methods] of domains) {
      report += `### ${domain}\n`;
      for (const method of methods) {
        const deps = this.dependencies.get(method) || new Set();
        if (deps.size > 0) {
          report += `- \`${method}\` → [${Array.from(deps).join(', ')}]\n`;
        } else {
          report += `- \`${method}\`\n`;
        }
      }
      report += `\n`;
    }
    
    // 4. 의존성이 많은 메서드 TOP 10
    report += `## 🔗 의존성이 많은 메서드 TOP 10\n\n`;
    const methodsByDependencyCount = Array.from(this.dependencies.entries())
      .map(([method, deps]) => [method, deps.size])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const hasHighDependencyMethods = methodsByDependencyCount.some(([, count]) => count > 0);
    if (hasHighDependencyMethods) {
      for (const [method, count] of methodsByDependencyCount) {
        if (count > 0) {
          const deps = Array.from(this.dependencies.get(method));
          report += `- **\`${method}\`** (${count}개 의존성)\n`;
          report += `  - 호출: ${deps.join(', ')}\n`;
        }
      }
    } else {
      report += `의존성이 있는 메서드가 발견되지 않았습니다.\n`;
    }
    
    // 5. 자주 호출되는 메서드 TOP 10
    report += `\n## 📞 자주 호출되는 메서드 TOP 10\n\n`;
    const usageCounts = new Map();
    for (const [, dependencies] of this.dependencies) {
      for (const dep of dependencies) {
        usageCounts.set(dep, (usageCounts.get(dep) || 0) + 1);
      }
    }
    
    const methodsByUsageCount = Array.from(usageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (methodsByUsageCount.length > 0) {
      for (const [method, count] of methodsByUsageCount) {
        const callers = Array.from(this.reverseDependencies.get(method) || []);
        report += `- **\`${method}\`** (${count}회 호출됨)\n`;
        if (callers.length > 0) {
          report += `  - 호출자: ${callers.join(', ')}\n`;
        }
      }
    } else {
      report += `호출되는 메서드가 발견되지 않았습니다.\n`;
    }
    
    // 6. 순환 의존성 검사
    report += `\n## 🔄 순환 의존성 검사\n\n`;
    const cycles = this.findCircularDependencies();
    if (cycles.length > 0) {
      report += `⚠️ **발견된 순환 의존성:**\n\n`;
      for (const cycle of cycles) {
        report += `- ${cycle.join(' → ')}\n`;
      }
    } else {
      report += `✅ 순환 의존성이 발견되지 않았습니다.\n`;
    }
    
    // 7. 의존성 체인 분석
    report += `\n## 🔗 주요 의존성 체인\n\n`;
    const dependencyChains = this.findDependencyChains();
    if (dependencyChains.length > 0) {
      for (const chain of dependencyChains.slice(0, 5)) { // 상위 5개만 표시
        report += `- ${chain.join(' → ')}\n`;
      }
    } else {
      report += `깊은 의존성 체인이 발견되지 않았습니다.\n`;
    }
    
    return report;
  }

  /**
   * 의존성 체인 찾기 (깊이 3 이상)
   */
  findDependencyChains() {
    const chains = [];
    const visited = new Set();
    
    const dfs = (method, path = []) => {
      if (path.includes(method) || visited.has(method)) return;
      
      const newPath = [...path, method];
      
      if (newPath.length >= 3) {
        chains.push([...newPath]);
      }
      
      if (newPath.length >= 5) return; // 최대 깊이 제한
      
      const dependencies = this.dependencies.get(method) || new Set();
      for (const dep of dependencies) {
        dfs(dep, newPath);
      }
    };
    
    for (const method of this.methods.keys()) {
      dfs(method);
    }
    
    // 길이순으로 정렬
    return chains.sort((a, b) => b.length - a.length);
  }

  /**
   * 도메인별 메서드 분류
   */
  classifyMethodsByDomain() {
    const domains = new Map();
    
    // 도메인 패턴 정의
    const domainPatterns = {
      'PROJECT DOMAIN': /^(setCurrentTemplate|setCurrentScene|createTemplate|createScene|validateCurrentScene|validateAllData|exportToJSON|exportToCSV|importFromJSON|resetEditor|loadFromLocalStorage|migrateToNewArchitecture)$/,
      'NODE DOMAIN': /^(setSelectedNode|toggleNodeSelection|clearSelection|selectMultipleNodes|copySelectedNodes|pasteNodes|duplicateNode|deleteSelectedNodes|moveSelectedNodes|addNode|updateNode|deleteNode|moveNode|updateDialogue|updateNodeText|updateChoiceText|createTextNode|createChoiceNode|addChoice|removeChoice|connectNodes|disconnectNodes|createAndConnectChoiceNode|createAndConnectTextNode|generateNodeKey|getCurrentNodeCount|canCreateNewNode|updateNodeKeyReference|updateChoiceKeyReference|updateNodeVisibility|updateNodePositionAndVisibility)$/,
      'HISTORY DOMAIN': /^(startCompoundAction|endCompoundAction|pushToHistory|pushToHistoryWithTextEdit|undo|redo|canUndo|canRedo)$/,
      'LAYOUT DOMAIN': /^(getNextNodePosition|calculateChildNodePosition|arrangeChildNodesAsTree|arrangeAllNodesAsTree|arrangeNodesWithDagre|arrangeAllNodes|arrangeSelectedNodeChildren|arrangeSelectedNodeDescendants)$/,
      'HELPER METHODS': /^_/
    };
    
    // 각 도메인 초기화
    for (const domain of Object.keys(domainPatterns)) {
      domains.set(domain, []);
    }
    domains.set('OTHER', []);
    
    // 메서드 분류
    for (const method of this.methods.keys()) {
      let classified = false;
      for (const [domain, pattern] of Object.entries(domainPatterns)) {
        if (pattern.test(method)) {
          domains.get(domain).push(method);
          classified = true;
          break;
        }
      }
      if (!classified) {
        domains.get('OTHER').push(method);
      }
    }
    
    // 빈 도메인 제거
    for (const [domain, methods] of domains) {
      if (methods.length === 0) {
        domains.delete(domain);
      }
    }
    
    return domains;
  }

  /**
   * 순환 의존성 검사 (DFS 기반)
   */
  findCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    const dfs = (method, path = []) => {
      if (recursionStack.has(method)) {
        // 순환 발견
        const cycleStart = path.indexOf(method);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), method]);
        }
        return;
      }
      
      if (visited.has(method)) return;
      
      visited.add(method);
      recursionStack.add(method);
      path.push(method);
      
      const dependencies = this.dependencies.get(method) || new Set();
      for (const dep of dependencies) {
        dfs(dep, [...path]);
      }
      
      recursionStack.delete(method);
    };
    
    for (const method of this.methods.keys()) {
      if (!visited.has(method)) {
        dfs(method);
      }
    }
    
    return cycles;
  }

  /**
   * 분석 실행
   */
  run() {
    console.log('🚀 editorStore.ts 메서드 의존성 분석 시작\n');
    
    this.loadFile();
    this.extractMethodDefinitions();
    this.analyzeDependencies();
    
    const report = this.generateReport();
    
    // 리포트 파일 저장
    const reportPath = path.join(process.cwd(), 'method-dependency-report.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`\n✅ 분석 완료! 리포트가 생성되었습니다: ${reportPath}`);
    console.log(`\n📋 간단 요약:`);
    console.log(`   - 총 메서드: ${this.methods.size}개`);
    console.log(`   - 공개 메서드: ${this.publicMethods.size}개`);
    console.log(`   - 헬퍼 메서드: ${this.helperMethods.size}개`);
    console.log(`   - 공통 헬퍼: ${this.identifyCommonHelpers().size}개`);
    
    return reportPath;
  }
}

// 실행
if (require.main === module) {
  const filePath = process.argv[2] || 'src/store/editorStore.ts';
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    console.log(`💡 사용법: node analyze_method_dependencies.cjs [파일경로]`);
    console.log(`💡 예시: node analyze_method_dependencies.cjs src/store/editorStore.ts`);
    process.exit(1);
  }
  
  const analyzer = new MethodDependencyAnalyzer(filePath);
  analyzer.run();
}

module.exports = { MethodDependencyAnalyzer }; 