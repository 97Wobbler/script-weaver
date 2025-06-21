# editorStore.ts 메서드 의존성 분석 리포트

**생성 시간:** 2025-06-20T23:36:59.702Z
**분석 파일:** src/store/editorStore.ts

## 📊 요약 통계

- **총 메서드 수:** 108
- **공개 메서드:** 60
- **헬퍼 메서드:** 48
- **공통 헬퍼 함수:** 5

## 🔧 공통 헬퍼 함수 (3회 이상 사용)

### `pushToHistory` (9회 사용)
**사용하는 메서드들:** pasteNodes, addNode, _finalizeNodesDeletion, _cleanupAfterNodeDeletion, _addMoveHistory, pushToHistoryWithTextEdit, arrangeChildNodesAsTree, arrangeAllNodesAsTree, arrangeNodesWithDagre

### `generateNodeKey` (5회 사용)
**사용하는 메서드들:** createTextNode, createChoiceNode, _createPastedNodes, _createNewChoiceChild, _createNewTextChild

### `_validateNodeCountLimit` (4회 사용)
**사용하는 메서드들:** createTextNode, createChoiceNode, _validateChoiceNodeCreation, _validateTextNodeCreation

### `endCompoundAction` (4회 사용)
**사용하는 메서드들:** _validateChoiceNodeCreation, _finalizeChoiceNodeCreation, _validateTextNodeCreation, _finalizeTextNodeCreation

### `_runLayoutSystem` (3회 사용)
**사용하는 메서드들:** _runGlobalLayoutSystem, _runDescendantLayoutSystem, _runChildLayoutSystem

## 🏗️ 도메인별 메서드 분류

### PROJECT DOMAIN
- `setCurrentTemplate`
- `setCurrentScene`
- `createTemplate`
- `createScene`
- `validateCurrentScene`
- `validateAllData`
- `exportToJSON`
- `exportToCSV`
- `importFromJSON` → [migrateToNewArchitecture]
- `resetEditor`
- `loadFromLocalStorage`
- `migrateToNewArchitecture`

### NODE DOMAIN
- `setSelectedNode`
- `toggleNodeSelection`
- `clearSelection`
- `selectMultipleNodes`
- `copySelectedNodes`
- `pasteNodes` → [_validatePasteOperation, _createPastedNodes, pushToHistory]
- `duplicateNode` → [pasteNodes]
- `deleteSelectedNodes` → [_getNodesForDeletion, _collectKeysForCleanup, _performNodesDeletion, _finalizeNodesDeletion]
- `moveSelectedNodes` → [moveNode]
- `addNode` → [pushToHistory]
- `updateNode`
- `deleteNode` → [_collectNodeKeysForCleanup, _performNodeDeletion, _cleanupAfterNodeDeletion]
- `moveNode` → [_validateNodeMovement, _checkContinuousDrag, _performNodeMove, _handleContinuousDrag, _addMoveHistory]
- `updateDialogue`
- `updateNodeText`
- `updateChoiceText`
- `createTextNode` → [_validateNodeCountLimit, generateNodeKey, getNextNodePosition, addNode]
- `createChoiceNode` → [_validateNodeCountLimit, generateNodeKey, getNextNodePosition, addNode]
- `addChoice`
- `removeChoice`
- `connectNodes`
- `disconnectNodes`
- `createAndConnectChoiceNode` → [_validateChoiceNodeCreation, _createNewChoiceChild, _finalizeChoiceNodeCreation]
- `createAndConnectTextNode` → [_validateTextNodeCreation, _createNewTextChild, _connectAndUpdateTextNode, _finalizeTextNodeCreation]
- `generateNodeKey`
- `getCurrentNodeCount`
- `canCreateNewNode` → [getCurrentNodeCount]
- `updateNodeKeyReference`
- `updateChoiceKeyReference`
- `updateNodeVisibility`
- `updateNodePositionAndVisibility`

### HISTORY DOMAIN
- `startCompoundAction`
- `endCompoundAction`
- `pushToHistory`
- `pushToHistoryWithTextEdit` → [pushToHistory]
- `undo` → [canUndo]
- `redo` → [canRedo]
- `canUndo`
- `canRedo`

### LAYOUT DOMAIN
- `getNextNodePosition` → [_initializePositionCalculation, _calculateCandidatePosition, _findNonOverlappingPosition]
- `calculateChildNodePosition` → [_getRealNodeDimensions, _calculateTextNodeChildPosition]
- `arrangeChildNodesAsTree` → [_buildNodeRelationMaps, _buildNodeLevelMap, _updateChildNodePositions, pushToHistory]
- `arrangeAllNodesAsTree` → [_buildNodeRelationMaps, _buildNodeLevelMap, _updateLevelNodePositions, pushToHistory]
- `arrangeNodesWithDagre` → [pushToHistory]
- `arrangeAllNodes` → [_findRootNodeForLayout, _runGlobalLayoutSystem, _handleLayoutResult]
- `arrangeSelectedNodeChildren` → [_findChildNodes, _runChildLayoutSystem, _handleChildLayoutResult]
- `arrangeSelectedNodeDescendants` → [_findDescendantNodes, _runDescendantLayoutSystem, _handleDescendantLayoutResult]

### HELPER METHODS
- `_validatePasteOperation` → [getCurrentNodeCount]
- `_setupPastedNodeLocalization`
- `_createPastedNodes` → [generateNodeKey, _setupPastedNodeLocalization]
- `_getRealNodeDimensions` → [_getEstimatedNodeDimensions]
- `_getEstimatedNodeDimensions`
- `_getNodesForDeletion`
- `_collectKeysForCleanup` → [_collectLocalizationKeys]
- `_performNodesDeletion`
- `_finalizeNodesDeletion` → [pushToHistory]
- `_validateChoiceNodeCreation` → [startCompoundAction, _validateNodeCountLimit, endCompoundAction]
- `_finalizeChoiceNodeCreation` → [arrangeSelectedNodeChildren, updateNodeVisibility, endCompoundAction]
- `_validateTextNodeCreation` → [startCompoundAction, _validateNodeCountLimit, endCompoundAction]
- `_connectAndUpdateTextNode`
- `_finalizeTextNodeCreation` → [arrangeSelectedNodeChildren, updateNodeVisibility, endCompoundAction]
- `_collectLocalizationKeys`
- `_collectNodeKeysForCleanup`
- `_findReferencingNodes`
- `_performNodeDeletion`
- `_cleanupAfterNodeDeletion` → [pushToHistory]
- `_validateNodeMovement`
- `_checkContinuousDrag`
- `_performNodeMove`
- `_handleContinuousDrag` → [_addMoveHistory]
- `_addMoveHistory` → [pushToHistory]
- `_validateNodeCountLimit`
- `_buildNodeRelationMaps`
- `_buildNodeLevelMap`
- `_updateLevelNodePositions`
- `_updateChildNodePositions`
- `_findRootNodeForLayout`
- `_runGlobalLayoutSystem` → [_runLayoutSystem]
- `_runLayoutSystem`
- `_handleLayoutResult`
- `_handleLayoutSystemResult`
- `_initializePositionCalculation`
- `_calculateCandidatePosition`
- `_findNonOverlappingPosition`
- `_getFallbackPosition`
- `_findRelatedNodes`
- `_findDescendantNodes` → [_findRelatedNodes]
- `_runDescendantLayoutSystem` → [_runLayoutSystem]
- `_handleDescendantLayoutResult`
- `_findChildNodes` → [_findRelatedNodes]
- `_runChildLayoutSystem` → [_runLayoutSystem]
- `_handleChildLayoutResult`
- `_createNewChoiceChild` → [generateNodeKey, calculateChildNodePosition]
- `_calculateTextNodeChildPosition`
- `_createNewTextChild` → [generateNodeKey, calculateChildNodePosition]

### OTHER
- `onRehydrateStorage`

## 🔗 의존성이 많은 메서드 TOP 10

- **`moveNode`** (5개 의존성)
  - 호출: _validateNodeMovement, _checkContinuousDrag, _performNodeMove, _handleContinuousDrag, _addMoveHistory
- **`deleteSelectedNodes`** (4개 의존성)
  - 호출: _getNodesForDeletion, _collectKeysForCleanup, _performNodesDeletion, _finalizeNodesDeletion
- **`createTextNode`** (4개 의존성)
  - 호출: _validateNodeCountLimit, generateNodeKey, getNextNodePosition, addNode
- **`createChoiceNode`** (4개 의존성)
  - 호출: _validateNodeCountLimit, generateNodeKey, getNextNodePosition, addNode
- **`createAndConnectTextNode`** (4개 의존성)
  - 호출: _validateTextNodeCreation, _createNewTextChild, _connectAndUpdateTextNode, _finalizeTextNodeCreation
- **`arrangeChildNodesAsTree`** (4개 의존성)
  - 호출: _buildNodeRelationMaps, _buildNodeLevelMap, _updateChildNodePositions, pushToHistory
- **`arrangeAllNodesAsTree`** (4개 의존성)
  - 호출: _buildNodeRelationMaps, _buildNodeLevelMap, _updateLevelNodePositions, pushToHistory
- **`pasteNodes`** (3개 의존성)
  - 호출: _validatePasteOperation, _createPastedNodes, pushToHistory
- **`deleteNode`** (3개 의존성)
  - 호출: _collectNodeKeysForCleanup, _performNodeDeletion, _cleanupAfterNodeDeletion
- **`createAndConnectChoiceNode`** (3개 의존성)
  - 호출: _validateChoiceNodeCreation, _createNewChoiceChild, _finalizeChoiceNodeCreation

## 📞 자주 호출되는 메서드 TOP 10

- **`pushToHistory`** (9회 호출됨)
  - 호출자: pasteNodes, addNode, _finalizeNodesDeletion, _cleanupAfterNodeDeletion, _addMoveHistory, pushToHistoryWithTextEdit, arrangeChildNodesAsTree, arrangeAllNodesAsTree, arrangeNodesWithDagre
- **`generateNodeKey`** (5회 호출됨)
  - 호출자: createTextNode, createChoiceNode, _createPastedNodes, _createNewChoiceChild, _createNewTextChild
- **`_validateNodeCountLimit`** (4회 호출됨)
  - 호출자: createTextNode, createChoiceNode, _validateChoiceNodeCreation, _validateTextNodeCreation
- **`endCompoundAction`** (4회 호출됨)
  - 호출자: _validateChoiceNodeCreation, _finalizeChoiceNodeCreation, _validateTextNodeCreation, _finalizeTextNodeCreation
- **`_runLayoutSystem`** (3회 호출됨)
  - 호출자: _runGlobalLayoutSystem, _runDescendantLayoutSystem, _runChildLayoutSystem
- **`_addMoveHistory`** (2회 호출됨)
  - 호출자: moveNode, _handleContinuousDrag
- **`getNextNodePosition`** (2회 호출됨)
  - 호출자: createTextNode, createChoiceNode
- **`addNode`** (2회 호출됨)
  - 호출자: createTextNode, createChoiceNode
- **`getCurrentNodeCount`** (2회 호출됨)
  - 호출자: canCreateNewNode, _validatePasteOperation
- **`startCompoundAction`** (2회 호출됨)
  - 호출자: _validateChoiceNodeCreation, _validateTextNodeCreation

## 🔄 순환 의존성 검사

✅ 순환 의존성이 발견되지 않았습니다.

## 🔗 주요 의존성 체인

- moveSelectedNodes → moveNode → _handleContinuousDrag → _addMoveHistory → pushToHistory
- createAndConnectChoiceNode → _createNewChoiceChild → calculateChildNodePosition → _getRealNodeDimensions → _getEstimatedNodeDimensions
- createAndConnectChoiceNode → _finalizeChoiceNodeCreation → arrangeSelectedNodeChildren → _findChildNodes → _findRelatedNodes
- createAndConnectChoiceNode → _finalizeChoiceNodeCreation → arrangeSelectedNodeChildren → _runChildLayoutSystem → _runLayoutSystem
- createAndConnectTextNode → _createNewTextChild → calculateChildNodePosition → _getRealNodeDimensions → _getEstimatedNodeDimensions
