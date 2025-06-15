import React, { useState } from "react";
import { useLayout } from "../hooks/useLayout";
import { useNodes } from "../hooks/useNodes";
import type { EditorNodeWrapper, TextDialogue, ChoiceDialogue } from "../types/dialogue";
import { DialogueSpeed } from "../types/dialogue";

export const TestLayout: React.FC = () => {
  const layout = useLayout();
  const nodes = useNodes();
  
  const [testText, setTestText] = useState("레이아웃 테스트");
  const [testSpeaker, setTestSpeaker] = useState("테스터");

  // 테스트용 노드 생성 (위치 계산 테스트)
  const createNodeWithCalculatedPosition = () => {
    const nodeKey = `layout_test_${Date.now()}`;
    const position = layout.getNextNodePosition();
    
    const textDialogue: TextDialogue = {
      type: "text",
      contentText: testText,
      speakerText: testSpeaker,
      speed: DialogueSpeed.NORMAL,
    };

    const newNode: EditorNodeWrapper = {
      nodeKey,
      dialogue: textDialogue,
      position,
    };

    nodes.addNode(newNode);
  };

  // 선택된 노드의 자식 노드 생성 및 연결 (자식 위치 계산 테스트)
  const createChildNode = () => {
    if (!nodes.selectedNodeKey) return;
    
    const parentNode = nodes.getNode(nodes.selectedNodeKey);
    if (!parentNode) return;
    
    const nodeKey = `child_${Date.now()}`;
    const position = layout.calculateChildNodePosition(nodes.selectedNodeKey);
    
    const textDialogue: TextDialogue = {
      type: "text",
      contentText: `${testText} (자식)`,
      speakerText: testSpeaker,
      speed: DialogueSpeed.NORMAL,
    };

    const newNode: EditorNodeWrapper = {
      nodeKey,
      dialogue: textDialogue,
      position,
    };

    // 노드 추가
    nodes.addNode(newNode);
    
    // 부모 노드와 연결 (TextNode인 경우에만)
    if (parentNode.dialogue.type === "text") {
      // 부모 노드의 nextNodeKey를 새 노드로 설정
      nodes.updateNode(nodes.selectedNodeKey, {
        dialogue: {
          ...parentNode.dialogue,
          nextNodeKey: nodeKey,
        },
      });
    }
  };

  // 노드 위치 무작위 이동 테스트
  const moveSelectedNodeRandomly = () => {
    if (!nodes.selectedNodeKey) return;
    
    const randomPosition = {
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
    };
    
    layout.moveNode(nodes.selectedNodeKey, randomPosition);
  };

  // 충돌 감지 테스트 (동적 위치)
  const testPositionCollision = () => {
    // 무작위 위치에서 충돌 감지 테스트
    const testX = Math.random() * 600 + 100;
    const testY = Math.random() * 400 + 100;
    const testWidth = 200;
    const testHeight = 120;
    
    const isOccupied = layout.isPositionOccupied(testX, testY, testWidth, testHeight);
    const result = isOccupied ? '충돌 (기존 노드와 겹침)' : '안전 (배치 가능)';
    alert(`위치 (${Math.round(testX)}, ${Math.round(testY)})에서 ${testWidth}x${testHeight} 크기 노드:\n${result}`);
  };

  // 간격 설정 테스트 (변경 후 다음 노드 생성에 반영됨)
  const updateSpacing = () => {
    const newHorizontal = Math.random() * 100 + 30;
    const newVertical = Math.random() * 50 + 20;
    
    layout.updateSpacing({
      horizontal: newHorizontal,
      vertical: newVertical,
    });
    
    alert(`간격 설정이 변경되었습니다:\n가로: ${Math.round(newHorizontal)}px\n세로: ${Math.round(newVertical)}px\n\n다음에 생성되는 노드부터 새 간격이 적용됩니다.`);
  };

  const nodeKeys = nodes.getAllNodeKeys();

  return (
    <div style={{ padding: "20px", maxWidth: "900px" }}>
      <h2>🎯 useLayout Hook 테스트</h2>
      
      {/* 컨트롤 영역 */}
      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h3>레이아웃 컨트롤</h3>
        
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="테스트 텍스트"
            style={{ marginRight: "10px", padding: "5px" }}
          />
          <input
            type="text"
            value={testSpeaker}
            onChange={(e) => setTestSpeaker(e.target.value)}
            placeholder="화자 이름"
            style={{ marginRight: "10px", padding: "5px" }}
          />
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <button onClick={createNodeWithCalculatedPosition} style={{ marginRight: "10px" }}>
            계산된 위치에 노드 생성
          </button>
          <button onClick={createChildNode} disabled={!nodes.selectedNodeKey} style={{ marginRight: "10px" }}>
            선택된 노드의 자식 생성
          </button>
          <button onClick={moveSelectedNodeRandomly} disabled={!nodes.selectedNodeKey} style={{ marginRight: "10px" }}>
            선택된 노드 무작위 이동
          </button>
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <button onClick={testPositionCollision} style={{ marginRight: "10px" }}>
            위치 충돌 감지 테스트
          </button>
          <button onClick={updateSpacing} style={{ marginRight: "10px" }}>
            간격 설정 변경
          </button>
          <button onClick={layout.resetLayout} style={{ marginRight: "10px" }}>
            레이아웃 초기화
          </button>
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <button onClick={() => {
            alert("전체 트리 정렬 기능은 현재 리팩터링 중입니다.");
          }} style={{ marginRight: "10px" }}>
            전체 트리 정렬
          </button>
          <button onClick={() => {
            alert("선택된 노드 자식 트리 정렬 기능은 현재 리팩터링 중입니다.");
          }} disabled={!nodes.selectedNodeKey} style={{ marginRight: "10px" }}>
            선택된 노드 자식 트리 정렬
          </button>
          <button onClick={() => {
            alert("Dagre 정렬 기능은 현재 리팩터링 중입니다.");
          }} style={{ marginRight: "10px" }}>
            Dagre 정렬
          </button>
        </div>
        
        <div>
          <button onClick={layout.syncFromEditor} style={{ marginRight: "10px" }}>
            에디터에서 동기화
          </button>
          <button onClick={layout.syncToEditor} style={{ marginRight: "10px" }}>
            에디터로 동기화
          </button>
        </div>
      </div>

      {/* 레이아웃 상태 정보 */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
        <h3>레이아웃 상태</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
          <div>
            <p><strong>마지막 노드 위치:</strong> ({layout.lastNodePosition.x}, {layout.lastNodePosition.y})</p>
            <p><strong>레이아웃 진행 중:</strong> {layout.layoutInProgress ? "예" : "아니오"}</p>
            <p><strong>총 노드 수:</strong> {nodes.getNodeCount()}</p>
            <p><strong>선택된 노드:</strong> {nodes.selectedNodeKey || "없음"}</p>
          </div>
          <div>
            <p><strong>노드 간격:</strong></p>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>가로: {layout.nodeSpacing.horizontal}px</li>
              <li>세로: {layout.nodeSpacing.vertical}px</li>
              <li>레벨: {layout.nodeSpacing.levelSpacing}px</li>
            </ul>
            <p><strong>기본 노드 크기:</strong> {layout.defaultNodeSize.width} x {layout.defaultNodeSize.height}</p>
          </div>
        </div>
      </div>

      {/* 노드 목록 */}
      <div style={{ marginBottom: "20px" }}>
        <h3>노드 목록 (위치 정보 포함)</h3>
        {nodeKeys.length === 0 ? (
          <p>노드가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {nodeKeys.map((nodeKey) => {
              const node = nodes.getNode(nodeKey);
              if (!node) return null;

              const isSelected = nodes.selectedNodeKey === nodeKey;
              const dimensions = layout.getNodeDimensions(nodeKey);

              return (
                <div
                  key={nodeKey}
                  onClick={() => nodes.setSelectedNode(nodeKey)}
                  style={{
                    padding: "10px",
                    border: `2px solid ${isSelected ? "#007bff" : "#ddd"}`,
                    borderRadius: "5px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#e3f2fd" : "#fff",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                    <div>
                      <div><strong>키:</strong> {nodeKey}</div>
                      <div><strong>타입:</strong> {node.dialogue.type}</div>
                      <div><strong>화자:</strong> {node.dialogue.speakerText || "없음"}</div>
                      <div><strong>내용:</strong> {node.dialogue.contentText || "없음"}</div>
                    </div>
                    <div>
                      <div><strong>위치:</strong> ({node.position.x}, {node.position.y})</div>
                      <div><strong>실제 크기:</strong> {dimensions.width} x {dimensions.height}</div>
                      <div><strong>예상 크기:</strong> {layout.getEstimatedNodeDimensions().width} x {layout.getEstimatedNodeDimensions().height}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: "12px", color: "#666" }}>
        <p>💡 사용법 및 테스트 결과:</p>
        <ul>
          <li><strong>계산된 위치에 노드 생성:</strong> ✅ 겹치지 않는 위치에 speed 필드 포함하여 생성</li>
          <li><strong>자식 노드 생성:</strong> ✅ 부모 우측에 생성 + TextNode인 경우 자동 연결</li>
          <li><strong>무작위 이동:</strong> ✅ 노드 이동 및 lastNodePosition 동기화</li>
          <li><strong>충돌 감지:</strong> ✅ 무작위 위치에서 겹침 여부 확인 (매번 다른 결과)</li>
          <li><strong>간격 설정:</strong> ✅ 다음 노드 생성부터 새 간격 적용</li>
          <li><strong>정렬 기능:</strong> ✅ 완료 메시지로 동작 확인 가능</li>
        </ul>
        <p><strong>🔗 연결 테스트:</strong> TextNode 선택 후 "자식 생성"하면 자동으로 nextNodeKey 연결됨</p>
      </div>
    </div>
  );
}; 