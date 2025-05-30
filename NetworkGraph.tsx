'use client';

import { useEffect, useState } from "react";
import Graph from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { useLayoutCircular } from "@react-sigma/layout-circular";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";


const NODE_COLORS = {
  Person: "#4CAF50",
  Song: "#2196F3",
  RecordLabel: "#F44336",
  Album: "#9C27B0",
  MusicalGroup: "#FF9800",
};


const INFLUENCE_EDGE_TYPES = new Set([
  "InterpolatesFrom",
  "CoverOf",
  "DirectlySamples",
  "LyricalReferenceTo",
  "InStyleOf",
]);

const COLLABORATED_EDGE_TYPES = new Set([
  "PerformerOf",
  "ComposerOf",
  "ProducerOf",
  "MemberOf",
  "LyricistOf",
]);

export interface Filters {
  switch1: boolean;
  switch2: boolean; 
  collaboratedWith: boolean; 
  influenced: boolean; 
  layoutType: "forceatlas" | "circular";
}

export interface NetworkGraphProps {
  keyword: string;
  filters: Filters;
  className?: string;
}

function GraphLoader({ keyword, filters }: { keyword: string; filters: Filters }) {
  const loadGraph = useLoadGraph();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/search-node/${encodeURIComponent(keyword)}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to load graph data");
          setLoading(false);
          return;
        }

        const graph = new Graph({ multi: true });
        const nodeMap = new Map<string, any>();

        
        data.data.nodes.forEach((node: any) => {
          if (!node.id) return;
          nodeMap.set(node.id.toString(), node);
        });

        let sailorShiftNodeId: string | null = null;
        for (const [id, node] of nodeMap.entries()) {
          if (node.name && node.name.toLowerCase() === keyword.toLowerCase()) {
            sailorShiftNodeId = id;
            break;
          }
        }

        
        const addedNodes = new Set<string>();
        const addNode = (id: string) => {
          if (!addedNodes.has(id) && nodeMap.has(id)) {
            const node = nodeMap.get(id);
            graph.addNode(id, {
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
              label: node.name,
              nodeType: node.type,
              color: NODE_COLORS[node.type as keyof typeof NODE_COLORS] || "#999",
              size:
                node.type === "Person"
                  ? 8
                  : node.type === "Song"
                  ? 6
                  : node.type === "Album"
                  ? 10
                  : node.type === "RecordLabel"
                  ? 12
                  : 7,
              ...node.properties,
            });
            addedNodes.add(id);
          }
        };

        if (sailorShiftNodeId) {
          
          if (filters.switch2) {
            addNode(sailorShiftNodeId);
            const filteredEdges = data.data.edges.filter(
              (edge: any) =>
                INFLUENCE_EDGE_TYPES.has(edge.type) &&
                (edge.source.toString() === sailorShiftNodeId || edge.target.toString() === sailorShiftNodeId)
            );
            filteredEdges.forEach((edge: any) => {
              addNode(edge.source.toString());
              addNode(edge.target.toString());
              graph.addDirectedEdge(edge.source.toString(), edge.target.toString(), {
                label: edge.type,
                size: 2,
                color: "orangered",
              });
            });
          } else if (filters.collaboratedWith || filters.influenced) {
            

            addNode(sailorShiftNodeId);

            
            const filteredEdges = data.data.edges.filter((edge: any) => {
              const source = edge.source.toString();
              const target = edge.target.toString();

            
              if (filters.collaboratedWith && source === sailorShiftNodeId && COLLABORATED_EDGE_TYPES.has(edge.type)) {
                return true;
              }

             
              if (filters.influenced && target === sailorShiftNodeId && INFLUENCE_EDGE_TYPES.has(edge.type)) {
                return true;
              }

              
              if (
                filters.influenced &&
                source === sailorShiftNodeId &&
                INFLUENCE_EDGE_TYPES.has(edge.type)
              ) {
                return true;
              }

              return false;
            });

            filteredEdges.forEach((edge: any) => {
              addNode(edge.source.toString());
              addNode(edge.target.toString());

              
              let source = edge.source.toString();
              let target = edge.target.toString();

              if (
                filters.influenced &&
                source === sailorShiftNodeId &&
                INFLUENCE_EDGE_TYPES.has(edge.type)
              ) {
                [source, target] = [target, source];
              }

              graph.addDirectedEdge(source, target, {
                label: edge.type,
                size: 2,
                color: "orangered",
              });
            });
          } else {
            
            nodeMap.forEach((_, id) => addNode(id));
            data.data.edges.forEach((edge: any) => {
              if (!edge.source || !edge.target) return;
              const source = edge.source.toString();
              const target = edge.target.toString();
              if (nodeMap.has(source) && nodeMap.has(target)) {
                graph.addDirectedEdge(source, target, {
                  label: edge.type,
                  size: 1,
                  color: "#888",
                });
              }
            });
          }
        } else {
          // No matching node found — show full graph 
          nodeMap.forEach((_, id) => addNode(id));
          data.data.edges.forEach((edge: any) => {
            if (!edge.source || !edge.target) return;
            const source = edge.source.toString();
            const target = edge.target.toString();
            if (nodeMap.has(source) && nodeMap.has(target)) {
              graph.addDirectedEdge(source, target, {
                label: edge.type,
                size: 1,
                color: "#888",
              });
            }
          });
        }

        loadGraph(graph);
      } catch (err) {
        setError("Failed to load graph data");
        console.error("Error loading graph:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [keyword, filters, loadGraph]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return null;
}

function LayoutController({ layout }: { layout: "forceatlas" | "circular" }) {
  const { assign: assignCircular } = useLayoutCircular();
  const { start: startForceAtlas, stop: stopForceAtlas } = useWorkerLayoutForceAtlas2({
    settings: {
      gravity: 0.5,
      adjustSizes: true,
      slowDown: 10,
      strongGravityMode: true,
      scalingRatio: 2,
      linLogMode: true,
      outboundAttractionDistribution: true,
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (layout === "circular") {
        stopForceAtlas();
        assignCircular();
      } else {
        assignCircular();
        setTimeout(() => startForceAtlas(), 100);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      stopForceAtlas();
    };
  }, [layout, assignCircular, startForceAtlas, stopForceAtlas]);

  return null;
}

export default function NetworkGraph({
  keyword,
  filters,
  className = "",
}: NetworkGraphProps) {
  return (
    <div className={className}>
      <SigmaContainer
        settings={{
          renderEdgeLabels: true,
          defaultNodeColor: "#999",
          defaultEdgeColor: "#666",
          labelSize: 12,
          labelWeight: "bold",
          minCameraRatio: 0.1,
          maxCameraRatio: 10,
          labelRenderedSizeThreshold: 6,
        }}
      >
        <GraphLoader keyword={keyword} filters={filters} />
        <LayoutController layout={filters.layoutType} />
      </SigmaContainer>
    </div>
  );
}
