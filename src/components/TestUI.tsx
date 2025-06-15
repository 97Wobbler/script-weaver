import React, { useState } from "react";
import { useUI } from "../hooks/useUI";

export const TestUI: React.FC = () => {
  const ui = useUI();
  
  // CSS 애니메이션을 위한 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [testMessage, setTestMessage] = useState("테스트 메시지");
  const [testTitle, setTestTitle] = useState("테스트 제목");
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // 비동기 작업 타이머 관리
  const [asyncTimer, setAsyncTimer] = useState<number | null>(null);
  const [systemStatusTimers, setSystemStatusTimers] = useState<Set<number>>(new Set());
  
  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      // 비동기 작업 타이머 정리
      if (asyncTimer) {
        clearTimeout(asyncTimer);
      }
      
      // 시스템 상태 타이머들 정리
      systemStatusTimers.forEach(timerId => clearTimeout(timerId));
    };
  }, [asyncTimer, systemStatusTimers]);

  // 토스트 테스트
  const testToast = (type: "success" | "info" | "warning" | "error") => {
    ui.showToast(`${type.toUpperCase()} 토스트: ${testMessage}`, type);
  };

  // 모달 테스트
  const testConfirmModal = () => {
    ui.showConfirm(
      testTitle,
      `확인 모달 테스트입니다.\n메시지: ${testMessage}`,
      () => {
        ui.showToast("확인 버튼을 클릭했습니다!", "success");
      },
      () => {
        ui.showToast("취소 버튼을 클릭했습니다.", "info");
      }
    );
  };

  const testAlertModal = () => {
    ui.showAlert(
      testTitle,
      `알림 모달 테스트입니다.\n메시지: ${testMessage}`,
      () => {
        ui.showToast("알림을 확인했습니다.", "info");
      }
    );
  };

  // 로딩 테스트
  const testLoading = () => {
    ui.setLoading(true, "로딩 중...", 0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      ui.updateLoadingProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          ui.setLoading(false);
          ui.showSuccess("로딩이 완료되었습니다!");
        }, 500);
      }
    }, 200);
  };

  // 에러 테스트
  const testError = () => {
    ui.showError(
      `에러 테스트: ${testMessage}`,
      "이것은 테스트용 에러 상세 정보입니다.\n실제 에러가 아닙니다."
    );
  };

  // 비동기 작업 테스트
  const testAsyncOperation = () => {
    const operationType = `테스트 작업: ${testMessage}`;
    
    if (!ui.startOperation(operationType)) {
      ui.showToast("이미 진행 중인 작업이 있습니다.", "warning");
      return;
    }
    
    // 이전 타이머가 있다면 취소
    if (asyncTimer) {
      clearTimeout(asyncTimer);
      setAsyncTimer(null);
    }
    
    // 3초 후 작업 완료
    const timerId = setTimeout(() => {
      // 작업이 여전히 진행 중인 경우에만 완료 처리 (operationType 체크 제거)
      if (ui.isOperationInProgress) {
        ui.endOperation();
        ui.showSuccess("비동기 작업이 완료되었습니다!");
      }
      setAsyncTimer(null);
    }, 3000);
    
    setAsyncTimer(timerId);
  };

  // 시스템 상태 테스트
  const testSystemStatus = (type: "idle" | "working" | "error" | "success") => {
    ui.updateSystemStatus(type, `${type.toUpperCase()} 상태: ${testMessage}`);
    
    if (type !== "idle") {
      // 이전 타이머들 정리
      systemStatusTimers.forEach(timerId => clearTimeout(timerId));
      setSystemStatusTimers(new Set());
      
      // 3초 후 idle로 복원
      const timerId = setTimeout(() => {
        ui.updateSystemStatus("idle", "자동 저장됨");
        setSystemStatusTimers(prev => {
          const newSet = new Set(prev);
          newSet.delete(timerId);
          return newSet;
        });
      }, 3000);
      
      setSystemStatusTimers(prev => new Set(prev).add(timerId));
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px" }}>
      <h2>🎨 useUI Hook 테스트</h2>
      
      {/* 컨트롤 영역 */}
      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h3>UI 컨트롤</h3>
        
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="테스트 메시지"
            style={{ marginRight: "10px", padding: "5px", width: "200px" }}
          />
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="테스트 제목"
            style={{ marginRight: "10px", padding: "5px", width: "150px" }}
          />
        </div>
        
        {/* 토스트 테스트 */}
        <div style={{ marginBottom: "15px" }}>
          <h4>토스트 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => testToast("success")} style={{ padding: "5px 10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "3px" }}>
              Success 토스트
            </button>
            <button onClick={() => testToast("info")} style={{ padding: "5px 10px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "3px" }}>
              Info 토스트
            </button>
            <button onClick={() => testToast("warning")} style={{ padding: "5px 10px", backgroundColor: "#ffc107", color: "black", border: "none", borderRadius: "3px" }}>
              Warning 토스트
            </button>
            <button onClick={() => testToast("error")} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px" }}>
              Error 토스트
            </button>
            <button onClick={ui.hideToast} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px" }}>
              토스트 숨기기
            </button>
          </div>
        </div>
        
        {/* 모달 테스트 */}
        <div style={{ marginBottom: "15px" }}>
          <h4>모달 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={testConfirmModal} style={{ padding: "5px 10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px" }}>
              Confirm 모달
            </button>
            <button onClick={testAlertModal} style={{ padding: "5px 10px", backgroundColor: "#6f42c1", color: "white", border: "none", borderRadius: "3px" }}>
              Alert 모달
            </button>
            <button onClick={ui.hideModal} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px" }}>
              모달 닫기
            </button>
          </div>
        </div>
        
        {/* 로딩 테스트 */}
        <div style={{ marginBottom: "15px" }}>
          <h4>로딩 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={testLoading} style={{ padding: "5px 10px", backgroundColor: "#20c997", color: "white", border: "none", borderRadius: "3px" }}>
              진행률 로딩 테스트
            </button>
            <button onClick={() => ui.setLoading(true, "단순 로딩...")} style={{ padding: "5px 10px", backgroundColor: "#fd7e14", color: "white", border: "none", borderRadius: "3px" }}>
              단순 로딩 시작
            </button>
            <button onClick={() => ui.setLoading(false)} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px" }}>
              로딩 중지
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={loadingProgress}
              onChange={(e) => {
                const progress = parseInt(e.target.value);
                setLoadingProgress(progress);
                ui.updateLoadingProgress(progress);
              }}
              style={{ width: "100px" }}
            />
            <span>{loadingProgress}%</span>
          </div>
        </div>
        
        {/* 에러 및 시스템 상태 테스트 */}
        <div style={{ marginBottom: "15px" }}>
          <h4>에러 및 시스템 상태 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={testError} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px" }}>
              에러 표시
            </button>
            <button onClick={ui.clearError} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px" }}>
              에러 지우기
            </button>
            <button onClick={() => testSystemStatus("working")} style={{ padding: "5px 10px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "3px" }}>
              Working 상태
            </button>
            <button onClick={() => testSystemStatus("success")} style={{ padding: "5px 10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "3px" }}>
              Success 상태
            </button>
            <button onClick={() => testSystemStatus("error")} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px" }}>
              Error 상태
            </button>
            <button onClick={() => testSystemStatus("idle")} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px" }}>
              Idle 상태
            </button>
          </div>
        </div>
        
        {/* 비동기 작업 테스트 */}
        <div style={{ marginBottom: "15px" }}>
          <h4>비동기 작업 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={testAsyncOperation} disabled={ui.isOperationInProgress} style={{ 
              padding: "5px 10px", 
              backgroundColor: ui.isOperationInProgress ? "#6c757d" : "#e83e8c", 
              color: "white", 
              border: "none", 
              borderRadius: "3px",
              cursor: ui.isOperationInProgress ? "not-allowed" : "pointer"
            }}>
              비동기 작업 시작
            </button>
            <button onClick={ui.endOperation} disabled={!ui.isOperationInProgress} style={{ 
              padding: "5px 10px", 
              backgroundColor: !ui.isOperationInProgress ? "#6c757d" : "#dc3545", 
              color: "white", 
              border: "none", 
              borderRadius: "3px",
              cursor: !ui.isOperationInProgress ? "not-allowed" : "pointer"
            }}>
              작업 강제 종료
            </button>
          </div>
        </div>
        
        {/* 동기화 테스트 */}
        <div>
          <h4>동기화 테스트</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={ui.syncFromEditor} style={{ padding: "5px 10px", backgroundColor: "#6f42c1", color: "white", border: "none", borderRadius: "3px" }}>
              에디터에서 동기화
            </button>
            <button onClick={ui.syncToEditor} style={{ padding: "5px 10px", backgroundColor: "#e83e8c", color: "white", border: "none", borderRadius: "3px" }}>
              에디터로 동기화
            </button>
            <button onClick={ui.resetUI} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px" }}>
              UI 초기화
            </button>
          </div>
        </div>
      </div>

      {/* UI 상태 정보 */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "5px" }}>
        <h3>UI 상태 정보</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px" }}>
          <div>
            <h4>토스트 상태</h4>
            <p><strong>표시 여부:</strong> {ui.toast.isVisible ? "표시됨" : "숨김"}</p>
            <p><strong>메시지:</strong> {ui.toast.message || "없음"}</p>
            <p><strong>타입:</strong> {ui.toast.type}</p>
            <p><strong>지속 시간:</strong> {ui.toast.duration}ms</p>
            
            <h4>시스템 상태</h4>
            <p><strong>상태:</strong> <span style={{ 
              color: ui.systemStatus.type === "error" ? "#dc3545" : 
                     ui.systemStatus.type === "working" ? "#17a2b8" : 
                     ui.systemStatus.type === "success" ? "#28a745" : "#6c757d"
            }}>{ui.systemStatus.type.toUpperCase()}</span></p>
            <p><strong>메시지:</strong> {ui.systemStatus.message}</p>
            <p><strong>타임스탬프:</strong> {new Date(ui.systemStatus.timestamp).toLocaleTimeString()}</p>
          </div>
          
          <div>
            <h4>모달 상태</h4>
            <p><strong>열림 여부:</strong> {ui.modal.isOpen ? "열림" : "닫힘"}</p>
            <p><strong>타입:</strong> {ui.modal.type || "없음"}</p>
            <p><strong>제목:</strong> {ui.modal.title || "없음"}</p>
            <p><strong>메시지:</strong> {ui.modal.message || "없음"}</p>
            
            <h4>로딩 상태</h4>
            <p><strong>로딩 중:</strong> {ui.loading.isLoading ? "예" : "아니오"}</p>
            <p><strong>메시지:</strong> {ui.loading.message || "없음"}</p>
            <p><strong>진행률:</strong> {ui.loading.progress || 0}%</p>
            
            <h4>에러 상태</h4>
            <p><strong>에러 여부:</strong> {ui.error.hasError ? "있음" : "없음"}</p>
            <p><strong>메시지:</strong> {ui.error.message || "없음"}</p>
            <p><strong>상세:</strong> {ui.error.details || "없음"}</p>
            
            <h4>비동기 작업</h4>
            <p><strong>진행 중:</strong> <span style={{ 
              color: ui.isOperationInProgress ? "#dc3545" : "#28a745",
              fontWeight: "bold"
            }}>{ui.isOperationInProgress ? "예" : "아니오"}</span></p>
            <p><strong>현재 작업:</strong> <span style={{ 
              color: ui.currentOperation ? "#17a2b8" : "#6c757d",
              fontStyle: ui.currentOperation ? "normal" : "italic"
            }}>{ui.currentOperation || "없음"}</span></p>
            <p><strong>Undo/Redo 가능:</strong> <span style={{ 
              color: ui.canPerformUndoRedo() ? "#28a745" : "#dc3545",
              fontWeight: "bold"
            }}>{ui.canPerformUndoRedo() ? "예" : "아니오"}</span></p>
          </div>
        </div>
      </div>

      {/* 실제 UI 컴포넌트들 (미리보기) */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "5px", border: "1px solid #ffeaa7" }}>
        <h3>실제 UI 컴포넌트 미리보기</h3>
        
        {/* 시스템 상태 표시 (하단바 스타일) */}
        <div style={{ 
          marginBottom: "10px", 
          padding: "8px 12px", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "5px", 
          border: "1px solid #dee2e6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "14px"
        }}>
          <div>시스템 상태 (하단바 스타일)</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ 
              width: "8px", 
              height: "8px", 
              borderRadius: "50%",
              backgroundColor: ui.systemStatus.type === "idle" ? "#28a745" : 
                             ui.systemStatus.type === "working" ? "#17a2b8" : 
                             ui.systemStatus.type === "success" ? "#28a745" : 
                             ui.systemStatus.type === "error" ? "#dc3545" : "#6c757d",
              animation: ui.systemStatus.type === "working" ? "pulse 1.5s infinite" : "none"
            }}></div>
            <span style={{ 
              color: ui.systemStatus.type === "error" ? "#dc3545" : 
                     ui.systemStatus.type === "working" ? "#17a2b8" : 
                     ui.systemStatus.type === "success" ? "#28a745" : "#6c757d"
            }}>
              {ui.systemStatus.message}
            </span>
          </div>
        </div>
        
        {/* 토스트 미리보기 */}
        {ui.toast.isVisible && (
          <div style={{ 
            marginBottom: "10px", 
            padding: "10px", 
            borderRadius: "5px",
            backgroundColor: ui.toast.type === "success" ? "#d4edda" : 
                           ui.toast.type === "info" ? "#d1ecf1" : 
                           ui.toast.type === "warning" ? "#fff3cd" : "#f8d7da",
            border: `1px solid ${ui.toast.type === "success" ? "#c3e6cb" : 
                                ui.toast.type === "info" ? "#bee5eb" : 
                                ui.toast.type === "warning" ? "#ffeaa7" : "#f5c6cb"}`,
            color: ui.toast.type === "success" ? "#155724" : 
                   ui.toast.type === "info" ? "#0c5460" : 
                   ui.toast.type === "warning" ? "#856404" : "#721c24"
          }}>
            <strong>토스트:</strong> {ui.toast.message}
            <button onClick={ui.hideToast} style={{ float: "right", background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}>×</button>
          </div>
        )}
        
        {/* 로딩 미리보기 */}
        {ui.loading.isLoading && (
          <div style={{ marginBottom: "10px", padding: "10px", backgroundColor: "#e2e3e5", borderRadius: "5px", border: "1px solid #d6d8db" }}>
            <div><strong>로딩:</strong> {ui.loading.message}</div>
            {ui.loading.progress !== undefined && (
              <div style={{ marginTop: "5px" }}>
                <div style={{ width: "100%", backgroundColor: "#f8f9fa", borderRadius: "3px", height: "10px" }}>
                  <div style={{ 
                    width: `${ui.loading.progress}%`, 
                    backgroundColor: "#007bff", 
                    height: "100%", 
                    borderRadius: "3px",
                    transition: "width 0.3s ease"
                  }}></div>
                </div>
                <div style={{ textAlign: "center", fontSize: "12px", marginTop: "2px" }}>{ui.loading.progress}%</div>
              </div>
            )}
          </div>
        )}
        
                 {/* 에러 미리보기 */}
         {ui.error.hasError && (
           <div style={{ marginBottom: "10px", padding: "10px", backgroundColor: "#f8d7da", borderRadius: "5px", border: "1px solid #f5c6cb", color: "#721c24" }}>
             <strong>에러:</strong> {ui.error.message}
             <button onClick={ui.clearError} style={{ float: "right", background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}>×</button>
             {ui.error.details && <div style={{ fontSize: "12px", marginTop: "5px", opacity: 0.8 }}>{ui.error.details}</div>}
           </div>
         )}
       </div>

      {/* 실제 모달 렌더링 */}
      {ui.modal.isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
          }}>
            {ui.modal.title && (
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                {ui.modal.title}
              </h3>
            )}
            
            {ui.modal.message && (
              <div style={{ 
                marginBottom: "24px", 
                fontSize: "14px", 
                lineHeight: "1.5", 
                color: "#666",
                whiteSpace: "pre-line"
              }}>
                {ui.modal.message}
              </div>
            )}
            
            {ui.modal.customContent && (
              <div style={{ marginBottom: "24px" }}>
                {ui.modal.customContent}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              {ui.modal.type === "confirm" && (
                <>
                  <button
                    onClick={() => {
                      ui.modal.onCancel?.();
                      ui.hideModal();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      ui.modal.onConfirm?.();
                      ui.hideModal();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    확인
                  </button>
                </>
              )}
              
              {ui.modal.type === "alert" && (
                <button
                  onClick={() => {
                    ui.modal.onConfirm?.();
                    ui.hideModal();
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  확인
                </button>
              )}
              
              {!ui.modal.type && (
                <button
                  onClick={ui.hideModal}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

              <div style={{ fontSize: "12px", color: "#666" }}>
          <p>💡 사용법 및 테스트 결과:</p>
          <ul>
            <li><strong>토스트:</strong> ✅ 4가지 타입별 표시, 자동 숨김, 수동 숨김 - 미리보기에서 확인 가능</li>
            <li><strong>모달:</strong> ✅ Confirm/Alert 모달, 콜백 처리 - 실제 모달 팝업으로 표시됨</li>
            <li><strong>로딩:</strong> ✅ 진행률 표시, 메시지 변경, 수동 제어 - 미리보기에서 확인 가능</li>
            <li><strong>에러:</strong> ✅ 에러 표시, 상세 정보, 자동 복원 - 토스트와 미리보기 동시 표시</li>
            <li><strong>시스템 상태:</strong> ✅ 4가지 상태 전환, 자동 복원 - 하단바 스타일로 표시</li>
            <li><strong>비동기 작업:</strong> ✅ 중복 방지, 강제 종료, Undo/Redo 차단 - 상태 정보에서 실시간 확인</li>
            <li><strong>동기화:</strong> ✅ editorStore와 연동 - 일반 모드 토스트와 연결됨</li>
          </ul>
          <p style={{ marginTop: "10px", padding: "8px", backgroundColor: "#e7f3ff", borderRadius: "4px", border: "1px solid #b3d9ff" }}>
            <strong>🔍 테스트 팁:</strong><br/>
            • 모달: 이제 실제 팝업으로 표시됩니다<br/>
            • 시스템 상태: 미리보기 상단의 "시스템 상태" 바에서 확인<br/>
            • 비동기 작업: "UI 상태 정보"의 "비동기 작업" 섹션에서 실시간 모니터링<br/>
            • 에러: 토스트 + 미리보기 + 시스템 상태에 동시 반영
          </p>
        </div>
    </div>
  );
}; 