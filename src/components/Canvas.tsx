import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import TextNode from './nodes/TextNode';
import ChoiceNode from './nodes/ChoiceNode';
import type { DialogueSpeed } from '../types/dialogue';

const nodeTypes = {
  textNode: TextNode,
  choiceNode: ChoiceNode,
};

// 테스트용 초기 노드들
const createTestNodes = (): Node[] => [
  {
    id: 'test-text-1',
    type: 'textNode',
    position: { x: 100, y: 100 },
    data: {
      nodeKey: 'test-text-1',
      dialogue: {
        type: 'text' as const,
        speakerKey: 'narrator',
        textKey: '게임이 시작됩니다.',
        nextNodeKey: 'test-choice-1',
        speed: 'NORMAL' as DialogueSpeed,
      },
    },
  },
  {
    id: 'test-choice-1',
    type: 'choiceNode',
    position: { x: 400, y: 100 },
    data: {
      nodeKey: 'test-choice-1',
      dialogue: {
        type: 'choice' as const,
        speakerKey: 'narrator',
        textKey: '어떻게 하시겠습니까?',
        choices: {
          'choice-1': {
            textKey: '앞으로 가기',
            nextNodeKey: 'test-text-2',
          },
          'choice-2': {
            textKey: '뒤로 가기',
            nextNodeKey: 'test-text-3',
          },
        },
        speed: 'NORMAL' as DialogueSpeed,
      },
    },
  },
];

const initialNodes: Node[] = createTestNodes();
const initialEdges: Edge[] = [
  {
    id: 'test-text-1-to-choice-1',
    source: 'test-text-1',
    target: 'test-choice-1',
    style: { stroke: '#6b7280', strokeWidth: 2 },
  },
];

export default function Canvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'textNode':
                return '#e3f2fd';
              case 'choiceNode':
                return '#e8f5e8';
              default:
                return '#f5f5f5';
            }
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
} 