#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TypeScript/TSX Dead Code 분석 시작 ===${NC}"
echo ""

# 결과 저장할 임시 파일들
UNUSED_FUNCTIONS_FILE="/tmp/unused_functions.txt"
UNUSED_VARIABLES_FILE="/tmp/unused_variables.txt"
UNUSED_EXPORTS_FILE="/tmp/unused_exports.txt"

# 기존 파일 삭제
rm -f "$UNUSED_FUNCTIONS_FILE" "$UNUSED_VARIABLES_FILE" "$UNUSED_EXPORTS_FILE"

# TypeScript/TSX 파일 찾기
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | sort)

echo -e "${YELLOW}검사 대상 파일들:${NC}"
echo "$TS_FILES"
echo ""

# 1. Export된 함수/변수 중 사용되지 않는 것들 찾기
echo -e "${BLUE}1. Export된 함수/변수 중 미사용 항목 검사...${NC}"

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # export된 함수들 찾기 (export function, export const 등)
        grep -n "^export \(function\|const\|let\|var\|class\|interface\|type\|enum\)" "$file" | while IFS=: read -r line_num line_content; do
            # 함수명이나 변수명 추출
            if [[ "$line_content" =~ export\ function\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="function"
            elif [[ "$line_content" =~ export\ const\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="const"
            elif [[ "$line_content" =~ export\ let\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="let"
            elif [[ "$line_content" =~ export\ var\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="var"
            elif [[ "$line_content" =~ export\ class\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="class"
            elif [[ "$line_content" =~ export\ interface\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="interface"
            elif [[ "$line_content" =~ export\ type\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="type"
            elif [[ "$line_content" =~ export\ enum\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="enum"
            else
                continue
            fi
            
            # 다른 파일에서 import되어 사용되는지 검사
            import_count=$(grep -r "import.*${name}" --include="*.ts" --include="*.tsx" . | grep -v "$file" | wc -l)
            # 파일 내에서 사용되는지 검사 (선언 라인 제외)
            usage_count=$(grep -n "${name}" "$file" | grep -v "^${line_num}:" | wc -l)
            
            if [ "$import_count" -eq 0 ] && [ "$usage_count" -eq 0 ]; then
                echo "UNUSED EXPORT: $file:$line_num - $type '$name'" >> "$UNUSED_EXPORTS_FILE"
            fi
        done

        # export { } 형태로 export된 것들 찾기
        grep -n "export {" "$file" | while IFS=: read -r line_num line_content; do
            # export { name1, name2 } 에서 이름들 추출
            if [[ "$line_content" =~ export\ \{([^}]+)\} ]]; then
                exports="${BASH_REMATCH[1]}"
                # 쉼표로 분리하여 각 export 검사
                IFS=',' read -ra EXPORT_ARRAY <<< "$exports"
                for export_item in "${EXPORT_ARRAY[@]}"; do
                    # 공백 제거 및 as 구문 처리
                    name=$(echo "$export_item" | sed 's/^ *//;s/ *$//' | sed 's/ as .*//')
                    
                    if [ -n "$name" ]; then
                        # 다른 파일에서 import되어 사용되는지 검사
                        import_count=$(grep -r "import.*${name}" --include="*.ts" --include="*.tsx" . | grep -v "$file" | wc -l)
                        
                        if [ "$import_count" -eq 0 ]; then
                            echo "UNUSED EXPORT: $file:$line_num - exported '$name'" >> "$UNUSED_EXPORTS_FILE"
                        fi
                    fi
                done
            fi
        done
    fi
done <<< "$TS_FILES"

# 2. 내부 함수들 중 사용되지 않는 것들 찾기
echo -e "${BLUE}2. 내부 함수 중 미사용 항목 검사...${NC}"

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # 내부 함수 선언 찾기 (export가 아닌 function)
        grep -n "^[[:space:]]*function\|^[[:space:]]*const.*=.*=>" "$file" | while IFS=: read -r line_num line_content; do
            # export된 것은 제외
            if [[ "$line_content" =~ ^[[:space:]]*export ]]; then
                continue
            fi
            
            # 함수명 추출
            if [[ "$line_content" =~ function\ ([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                name="${BASH_REMATCH[1]}"
                type="function"
            elif [[ "$line_content" =~ const\ ([a-zA-Z_][a-zA-Z0-9_]*).*= ]]; then
                name="${BASH_REMATCH[1]}"
                type="const function"
            else
                continue
            fi
            
            # 같은 파일 내에서 사용되는지 검사 (선언 라인 제외)
            usage_count=$(grep -n "${name}" "$file" | grep -v "^${line_num}:" | wc -l)
            
            if [ "$usage_count" -eq 0 ]; then
                echo "UNUSED FUNCTION: $file:$line_num - $type '$name'" >> "$UNUSED_FUNCTIONS_FILE"
            fi
        done
    fi
done <<< "$TS_FILES"

# 3. 내부 변수들 중 사용되지 않는 것들 찾기
echo -e "${BLUE}3. 내부 변수 중 미사용 항목 검사...${NC}"

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # 내부 변수 선언 찾기 (const, let, var)
        grep -n "^[[:space:]]*\(const\|let\|var\)[[:space:]]" "$file" | while IFS=: read -r line_num line_content; do
            # export된 것은 제외
            if [[ "$line_content" =~ ^[[:space:]]*export ]]; then
                continue
            fi
            
            # 함수 형태는 제외 (화살표 함수나 함수 표현식)
            if [[ "$line_content" =~ =.*=\> ]] || [[ "$line_content" =~ =.*function ]]; then
                continue
            fi
            
            # 변수명 추출
            if [[ "$line_content" =~ (const|let|var)[[:space:]]+([a-zA-Z_][a-zA-Z0-9_]*) ]]; then
                var_type="${BASH_REMATCH[1]}"
                name="${BASH_REMATCH[2]}"
            else
                continue
            fi
            
            # 같은 파일 내에서 사용되는지 검사 (선언 라인 제외)
            usage_count=$(grep -n "\b${name}\b" "$file" | grep -v "^${line_num}:" | wc -l)
            
            if [ "$usage_count" -eq 0 ]; then
                echo "UNUSED VARIABLE: $file:$line_num - $var_type '$name'" >> "$UNUSED_VARIABLES_FILE"
            fi
        done
    fi
done <<< "$TS_FILES"

# 결과 출력
echo ""
echo -e "${GREEN}=== 분석 결과 ===${NC}"
echo ""

if [ -f "$UNUSED_EXPORTS_FILE" ] && [ -s "$UNUSED_EXPORTS_FILE" ]; then
    echo -e "${RED}🚨 사용되지 않는 Export 항목들:${NC}"
    cat "$UNUSED_EXPORTS_FILE"
    echo ""
else
    echo -e "${GREEN}✅ 모든 export 항목이 사용되고 있습니다.${NC}"
    echo ""
fi

if [ -f "$UNUSED_FUNCTIONS_FILE" ] && [ -s "$UNUSED_FUNCTIONS_FILE" ]; then
    echo -e "${RED}🚨 사용되지 않는 내부 함수들:${NC}"
    cat "$UNUSED_FUNCTIONS_FILE"
    echo ""
else
    echo -e "${GREEN}✅ 모든 내부 함수가 사용되고 있습니다.${NC}"
    echo ""
fi

if [ -f "$UNUSED_VARIABLES_FILE" ] && [ -s "$UNUSED_VARIABLES_FILE" ]; then
    echo -e "${RED}🚨 사용되지 않는 내부 변수들:${NC}"
    cat "$UNUSED_VARIABLES_FILE"
    echo ""
else
    echo -e "${GREEN}✅ 모든 내부 변수가 사용되고 있습니다.${NC}"
    echo ""
fi

# 임시 파일 정리
rm -f "$UNUSED_FUNCTIONS_FILE" "$UNUSED_VARIABLES_FILE" "$UNUSED_EXPORTS_FILE"

echo -e "${BLUE}=== 분석 완료 ===${NC}"
echo ""
echo -e "${YELLOW}주의사항:${NC}"
echo "- 동적으로 호출되는 함수는 감지되지 않을 수 있습니다"
echo "- 타입스크립트의 타입 추론에 사용되는 변수는 미사용으로 표시될 수 있습니다"
echo "- React 컴포넌트 내부의 이벤트 핸들러 등은 정확히 감지되지 않을 수 있습니다"
echo "- 결과를 확인한 후 수동으로 검증하는 것을 권장합니다" 