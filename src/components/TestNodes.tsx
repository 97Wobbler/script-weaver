import React, { useState } from "react";
import { useNodes } from "../hooks/useNodes";
import type { EditorNodeWrapper, TextDialogue, ChoiceDialogue } from "../types/dialogue";

/**
 * useNodes Hook을 테스트하기 위한 간단한 컴포넌트
 */
export const TestNodes: React.FC = () => {
  const {
    nodes,
    selectedNodeKey,
    selectedNodeKeys,
    addNode,
    updateNode,
    deleteNode,
    getNode,
    setSelectedNode,
    toggleNodeSelection,
    clearSelection,
    getNodeCount,
    getAllNodeKeys,
    syncFromEditor,
    syncToEditor
  } = useNodes();

  const [testText, setTestText] = useState("안녕하세요!");
  const [testSpeaker, setTestSpeaker] = useState("테스트");

  // 테스트용 텍스트 노드 생성
  const createTestTextNode = () => {
    const nodeKey = `test_${Date.now()}`;
    const textDialogue: TextDialogue = {
      type: "text",
      contentText: testText,
      speakerText: testSpeaker,
    };

    const newNode: EditorNodeWrapper = {
      nodeKey,
      dialogue: textDialogue,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
    };

    addNode(newNode);
  };

  // 테스트용 선택지 노드 생성
  const createTestChoiceNode = () => {
    const nodeKey = `choice_${Date.now()}`;
    const choiceDialogue: ChoiceDialogue = {
      type: "choice",
      contentText: "어떻게 하시겠습니까?",
      speakerText: testSpeaker,
      choices: {
        option1: {
          choiceText: "옵션 1",
          nextNodeKey: "",
        },
        option2: {
          choiceText: "옵션 2", 
          nextNodeKey: "",
        },
      },
    };

    const newNode: EditorNodeWrapper = {
      nodeKey,
      dialogue: choiceDialogue,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
    };

    addNode(newNode);
  };

  // 선택된 노드 수정
  const updateSelectedNode = () => {
    if (selectedNodeKey) {
      const node = getNode(selectedNodeKey);
      if (node) {
        updateNode(selectedNodeKey, {
          ...node,
          dialogue: {
            ...node.dialogue,
            contentText: `수정됨: ${testText}`,
            speakerText: testSpeaker, // 화자도 함께 업데이트
          },
        });
      }
    }
  };

  // 선택된 노드 삭제
  const deleteSelectedNode = () => {
    if (selectedNodeKey) {
      deleteNode(selectedNodeKey);
    }
  };

  const nodeKeys = getAllNodeKeys();

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      <h2>🧪 useNodes Hook 테스트</h2>
      
      {/* 컨트롤 영역 */}
      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h3>컨트롤</h3>
        
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
          <button onClick={createTestTextNode} style={{ marginRight: "10px" }}>
            텍스트 노드 추가
          </button>
          <button onClick={createTestChoiceNode} style={{ marginRight: "10px" }}>
            선택지 노드 추가
          </button>
          <button onClick={updateSelectedNode} disabled={!selectedNodeKey} style={{ marginRight: "10px" }}>
            선택된 노드 수정
          </button>
          <button onClick={deleteSelectedNode} disabled={!selectedNodeKey} style={{ marginRight: "10px" }}>
            선택된 노드 삭제
          </button>
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <button onClick={clearSelection} style={{ marginRight: "10px" }}>
            선택 해제
          </button>
          <button onClick={syncFromEditor} style={{ marginRight: "10px" }}>
            에디터에서 동기화
          </button>
          <button onClick={syncToEditor} style={{ marginRight: "10px" }}>
            에디터로 동기화
          </button>
        </div>
      </div>

      {/* 상태 정보 */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "5px" }}>
        <h3>상태 정보</h3>
        <p><strong>총 노드 수:</strong> {getNodeCount()}</p>
        <p><strong>선택된 노드:</strong> {selectedNodeKey || "없음"}</p>
        <p><strong>다중 선택:</strong> {Array.from(selectedNodeKeys).join(", ") || "없음"}</p>
        <p><strong>노드 키 목록:</strong> {nodeKeys.join(", ") || "없음"}</p>
      </div>

      {/* 노드 목록 */}
      <div style={{ marginBottom: "20px" }}>
        <h3>노드 목록</h3>
        {nodeKeys.length === 0 ? (
          <p>노드가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {nodeKeys.map((nodeKey) => {
              const node = getNode(nodeKey);
              if (!node) return null;

              const isSelected = selectedNodeKey === nodeKey;
              const isMultiSelected = selectedNodeKeys.has(nodeKey);

              return (
                <div
                  key={nodeKey}
                  onClick={(e) => {
                    // 더블클릭과 충돌 방지를 위해 지연 처리
                    if (e.detail === 1) {
                      setTimeout(() => {
                        if (e.detail === 1) {
                          setSelectedNode(nodeKey);
                        }
                      }, 200);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    toggleNodeSelection(nodeKey);
                  }}
                  style={{
                    padding: "10px",
                    border: `2px solid ${isSelected ? "#007bff" : isMultiSelected ? "#28a745" : "#ddd"}`,
                    borderRadius: "5px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#e3f2fd" : isMultiSelected ? "#e8f5e9" : "#fff",
                  }}
                >
                  <div><strong>키:</strong> {nodeKey}</div>
                  <div><strong>타입:</strong> {node.dialogue.type}</div>
                  <div><strong>화자:</strong> {node.dialogue.speakerText || "없음"}</div>
                  <div><strong>내용:</strong> {node.dialogue.contentText || "없음"}</div>
                  <div><strong>위치:</strong> ({node.position.x}, {node.position.y})</div>
                  {node.dialogue.type === "choice" && (
                    <div>
                      <strong>선택지:</strong> {Object.keys((node.dialogue as ChoiceDialogue).choices).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: "12px", color: "#666" }}>
        <p>💡 사용법:</p>
        <ul>
          <li>노드 클릭: 단일 선택</li>
          <li>노드 더블클릭: 다중 선택 토글</li>
          <li>선택된 노드가 있을 때 수정/삭제 버튼 활성화</li>
        </ul>
      </div>
    </div>
  );
}; 