import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Controls as FlowControls,
  Background,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import Controls from "./components/Controls.jsx";
import { validateDag } from "./components/ValidationService";
import JsonPreview from "./components/JsonPreview.jsx";

const nodeWidth = 180;
const nodeHeight = 60;

// Move nodeTypes outside the component to avoid React Flow warning
const nodeTypes = {};

function FlowContent({ nodes, setNodes, edges, setEdges, isValidDag, setIsValidDag, selected, setSelected }) {
  const { fitView } = useReactFlow();
  const reactFlowWrapper = useRef(null);

  // Validate DAG on every change
  useEffect(() => {
    setIsValidDag(validateDag(nodes, edges));
  }, [nodes, edges, setIsValidDag]);

  // Delete selected nodes/edges with Delete key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selected.nodes.length > 0) {
          const nodeIds = selected.nodes.map((n) => n.id);
          setNodes((nds) => nds.filter((n) => !nodeIds.includes(n.id)));
          setEdges((eds) =>
            eds.filter(
              (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
            )
          );
        }
        if (selected.edges.length > 0) {
          const edgeIds = selected.edges.map((e) => e.id);
          setEdges((eds) => eds.filter((e) => !edgeIds.includes(e.id)));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, setNodes, setEdges]);

  // Add Node Handler
  const handleAddNode = useCallback(() => {
    const label = prompt("Enter node label:");
    if (!label) return;
    const id = `${+new Date()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        data: { label },
        position: {
          x: Math.random() * 250,
          y: Math.random() * 250,
        },
        type: "default",
      },
    ]);
  }, [setNodes]);

  // Edge connect handler
  const onConnect = useCallback(
    (params) => {
      // Prevent self-loop
      if (params.source === params.target) return;
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: "arrowclosed" } }, eds));
    },
    [setEdges]
  );

  // Selection handler
  const onSelectionChange = useCallback((sel) => {
    setSelected({
      nodes: sel.nodes || [],
      edges: sel.edges || [],
    });
  }, [setSelected]);

  // Auto Layout Handler
  const handleAutoLayout = useCallback(() => {
    if (nodes.length < 2) return; // Only run if at least 2 nodes

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR" });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPos = dagreGraph.node(node.id);
        if (!nodeWithPos) return node;
        return {
          ...node,
          position: {
            x: nodeWithPos.x - nodeWidth / 2,
            y: nodeWithPos.y - nodeHeight / 2,
          },
        };
      })
    );
    setTimeout(() => fitView(), 100);
  }, [nodes, edges, setNodes, fitView]);

  return (
    <>
      <Controls onAddNode={handleAddNode} onAutoLayout={handleAutoLayout} />
      <div style={{ width: "100%", height: "90vh" }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes.filter(node => node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number')}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          fitView
          nodeTypes={nodeTypes}
          connectionLineStyle={{ stroke: "#222", strokeWidth: 2 }}
          connectionLineType="bezier"
          defaultEdgeOptions={{ markerEnd: { type: "arrowclosed" } }}
        >
          <MiniMap />
          <FlowControls />
          <Background />
        </ReactFlow>
      </div>
      <div style={{ padding: "10px" }}>
        <b>
          Status:{" "}
          <span style={{ color: isValidDag.valid ? "green" : "red" }}>
            {isValidDag.valid ? "Valid DAG" : `Invalid DAG: ${isValidDag.reason}`}
          </span>
        </b>
      </div>
      <JsonPreview nodes={nodes} edges={edges} />
    </>
  );
}

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isValidDag, setIsValidDag] = useState({ valid: true, reason: "" });
  const [selected, setSelected] = useState({ nodes: [], edges: [] });

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <FlowContent
          nodes={nodes}
          setNodes={setNodes}
          edges={edges}
          setEdges={setEdges}
          isValidDag={isValidDag}
          setIsValidDag={setIsValidDag}
          selected={selected}
          setSelected={setSelected}
        />
      </ReactFlowProvider>
    </div>
  );
}

export default App; 