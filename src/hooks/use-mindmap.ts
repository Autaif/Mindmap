import { useState, useEffect, useCallback } from 'react';
import { MapNode, SEED_DATA } from '../types';

const STORAGE_KEY = 'quiet-mindmap-data';

export function useMindmap() {
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNodes(JSON.parse(saved));
      } else {
        setNodes(SEED_DATA);
        setIsFirstLaunch(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      }
    } catch (e) {
      console.error("Failed to load mindmap data", e);
      setNodes([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  const save = useCallback((newNodes: MapNode[]) => {
    setNodes(newNodes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newNodes));
  }, []);

  const addNode = useCallback((node: Omit<MapNode, 'id' | 'createdAt' | 'updatedAt' | 'position'> & { position?: {x:number, y:number} }) => {
    const newNode: MapNode = {
      ...node,
      id: crypto.randomUUID(),
      position: node.position || { x: 2000, y: 2000 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    save([...nodes, newNode]);
    return newNode;
  }, [nodes, save]);

  const updateNode = useCallback((id: string, updates: Partial<MapNode>) => {
    save(nodes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, [nodes, save]);

  const removeNode = useCallback((id: string) => {
    save(nodes.filter(n => n.id !== id));
  }, [nodes, save]);

  const clearAll = useCallback(() => {
    save([]);
    setIsFirstLaunch(false);
  }, [save]);

  const dismissFirstLaunch = useCallback(() => {
    setIsFirstLaunch(false);
  }, []);

  return {
    nodes,
    isFirstLaunch,
    isReady,
    addNode,
    updateNode,
    removeNode,
    clearAll,
    dismissFirstLaunch
  };
}
