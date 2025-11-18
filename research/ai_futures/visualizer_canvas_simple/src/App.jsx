import React, { useState, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RotateCcw, Undo2 } from "lucide-react";

import { STATES, INITIAL_VARS } from "./data/states";
import { applyEffect } from "./data/effects";
import { makeEdges, layoutWithDagre } from "./lib/layout";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Metric } from "./components/Metric";

// Chart component
const Chart = ({ data, dataKey, domain, format }) => (
  <div className="h-24 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
        <XAxis dataKey="step" hide />
        <YAxis hide domain={domain} />
        <Tooltip
          formatter={(v) => (format ? format(v) : v)}
          labelFormatter={(label) => 'step ' + label}
        />
        <Line type="monotone" dataKey={dataKey} dot={false} strokeWidth={1.8} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default function App() {
  const [vars, setVars] = useState(INITIAL_VARS);
  const [history, setHistory] = useState([
    { step: 0, state: "S0", from: null, actionLabel: null, edgeId: null, ...INITIAL_VARS },
  ]);
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState("S0");
  const [orientation, setOrientation] = useState("LR");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const visitedStates = useMemo(
    () => new Set(history.map((h) => h.state)),
    [history]
  );

  const trajectoryEdgeIds = useMemo(
    () => new Set(history.map((h) => h.edgeId).filter(Boolean)),
    [history]
  );

  const onChoose = (action, edgeId) => {
    const nextVars = applyEffect(vars, action.effect || {});
    const nextStep = step + 1;
    const nextState = action.to;

    setVars(nextVars);
    setStep(nextStep);
    setCurrent(nextState);
    setHistory([
      ...history,
      {
        step: nextStep,
        state: nextState,
        from: current,
        actionLabel: action.label,
        edgeId,
        ...nextVars,
      },
    ]);
  };

  const onReset = () => {
    setVars(INITIAL_VARS);
    setHistory([
      { step: 0, state: "S0", from: null, actionLabel: null, edgeId: null, ...INITIAL_VARS },
    ]);
    setStep(0);
    setCurrent("S0");
  };

  const onUndo = () => {
    if (history.length <= 1) return;
    const newHist = history.slice(0, -1);
    const prior = newHist[newHist.length - 1];

    setVars({
      compute: prior.compute,
      rnd: prior.rnd,
      sec: prior.sec,
      hack: prior.hack,
      align: prior.align,
      gov: prior.gov,
    });
    setStep(prior.step);
    setCurrent(prior.state);
    setHistory(newHist);
  };

  useEffect(() => {
    const baseNodes = Array.from(visitedStates).map((id) => {
      const s = STATES[id];
      const isCurrent = id === current;
      const isStart = id === "S0";

      let borderColor = "#cbd5e1";
      let background = "#ffffff";

      if (isCurrent) {
        borderColor = "#2563eb";
        background = "#eff6ff";
      } else if (!isStart) {
        borderColor = "#38bdf8";
        background = "#f8fafc";
      }

      return {
        id,
        data: { label: s.title },
        position: { x: 0, y: 0 },
        style: {
          padding: 10,
          borderRadius: 12,
          background,
          color: "#0f172a",
          width: 260,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor,
          fontSize: 12,
        },
      };
    });

    const allEdges = makeEdges(STATES);
    const filteredEdges = allEdges.filter(
      (e) => visitedStates.has(e.source) && visitedStates.has(e.target)
    );

    const laidOutNodes = layoutWithDagre(baseNodes, filteredEdges, orientation);

    const styledEdges = filteredEdges.map((e) => {
      const onTrajectory = trajectoryEdgeIds.has(e.id);
      return {
        ...e,
        animated: onTrajectory,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          strokeWidth: onTrajectory ? 2.4 : 1.2,
          stroke: onTrajectory ? "#2563eb" : "#cbd5e1",
        },
        labelStyle: {
          fontSize: 10,
          fill: "#475569",
          fontWeight: onTrajectory ? 600 : 400,
          backgroundColor: "#ffffffcc",
          padding: 2,
          borderRadius: 4,
        },
      };
    });

    setNodes(laidOutNodes);
    setEdges(styledEdges);
  }, [visitedStates, current, orientation, trajectoryEdgeIds, setNodes, setEdges]);

  const actions = STATES[current].actions;
  const prev = history.length > 1 ? history[history.length - 2] : history[0];
  const deltas = {
    compute: vars.compute - prev.compute,
    rnd: vars.rnd - prev.rnd,
    sec: vars.sec - prev.sec,
    hack: vars.hack - prev.hack,
    align: vars.align - prev.align,
    gov: vars.gov - prev.gov,
  };

  const trajectory = history.filter((h) => h.step > 0);

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 bg-slate-50">
      <div className="h-[46vh] rounded-2xl border border-slate-200 shadow-sm bg-white flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-700">
            AI-2027 state machine
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Layout</span>
            <div className="inline-flex rounded-md border border-slate-300 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setOrientation("LR")}
                className={'px-2 py-1 text-[11px] font-medium ' + (orientation === "LR" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100")}
              >
                LR
              </button>
              <button
                type="button"
                onClick={() => setOrientation("TB")}
                className={'px-2 py-1 text-[11px] font-medium ' + (orientation === "TB" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100")}
              >
                TB
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            className="bg-slate-50"
          >
            <Background gap={24} size={1} color="#e2e8f0" />
            <MiniMap
              pannable
              zoomable
              className="!bg-white !border !border-slate-200"
              nodeColor={(node) => node.id === current ? "#2563eb" : "#38bdf8"}
            />
            <Controls className="!bg-white !border !border-slate-200" />
          </ReactFlow>
        </div>
      </div>

      <div className="flex flex-col gap-3 h-[44vh]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-none">
          <Card className="bg-white border-slate-200 shadow-sm col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Current state</div>
                  <div className="text-base font-semibold text-slate-900">
                    {STATES[current].title}
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] border-slate-300 text-slate-700">
                  step {step}
                </Badge>
              </div>
              <div className="text-xs text-slate-600 leading-snug">
                {STATES[current].blurb}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onReset} className="gap-2 text-xs">
                  <RotateCcw className="w-3 h-3" /> Reset
                </Button>
                <Button variant="outline" size="sm" onClick={onUndo} className="gap-2 text-xs">
                  <Undo2 className="w-3 h-3" /> Undo
                </Button>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Only visited states are shown in the graph; future states appear as you commit to actions.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm col-span-1 md:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Actions</div>
                {actions.length === 0 ? (
                  <div className="text-xs text-slate-500">No available actions from this terminal state.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                    {actions.map((a, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        className="justify-start h-auto py-2 text-left text-xs bg-slate-100 hover:bg-slate-200"
                        onClick={() => onChoose(a, current + '-' + idx)}
                      >
                        <div className="leading-snug">
                          <div className="font-medium text-slate-900">{a.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 mt-1">
                <div className="text-sm font-semibold text-slate-900 mb-1">Trajectory</div>
                {trajectory.length === 0 ? (
                  <div className="text-xs text-slate-500">No actions taken yet.</div>
                ) : (
                  <ol className="text-[11px] text-slate-600 space-y-1 max-h-24 overflow-y-auto pr-1">
                    {trajectory.map((h, i) => (
                      <li key={i} className="flex gap-1">
                        <span className="text-slate-400">{h.step}.</span>
                        <span>
                          <span className="font-mono text-slate-700">{h.from} → {h.state}</span>
                          {h.actionLabel && ' — ' + h.actionLabel}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm flex-1 min-h-[20vh]">
          <CardContent className="p-4 space-y-3 h-full overflow-y-auto">
            <div className="text-sm font-semibold text-slate-900">State variables</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Metric name="Compute (vs 2024)" value={vars.compute} unit="×" delta={deltas.compute} />
                <Chart data={history} dataKey="compute" domain={[0.8, "auto"]} format={(v) => Number(v).toFixed(2) + '×'} />
              </div>
              <div>
                <Metric name="AI R&D productivity" value={vars.rnd} unit="×" delta={deltas.rnd} />
                <Chart data={history} dataKey="rnd" domain={[0.8, "auto"]} format={(v) => Number(v).toFixed(2) + '×'} />
              </div>
              <div>
                <Metric name="Security level" value={vars.sec} unit="lvl" delta={deltas.sec} />
                <Chart data={history} dataKey="sec" domain={[0, 5]} format={(v) => 'lvl ' + Number(v).toFixed(1)} />
              </div>
              <div>
                <Metric name="Hacking / theft risk" value={vars.hack} unit="%" delta={deltas.hack} />
                <Chart data={history} dataKey="hack" domain={[0, 1]} format={(v) => (Number(v) * 100).toFixed(0) + '%'} />
              </div>
              <div>
                <Metric name="Alignment risk" value={vars.align} unit="%" delta={deltas.align} />
                <Chart data={history} dataKey="align" domain={[0, 1]} format={(v) => (Number(v) * 100).toFixed(0) + '%'} />
              </div>
              <div>
                <Metric name="Gov. centralization" value={vars.gov} unit="%" delta={deltas.gov} />
                <Chart data={history} dataKey="gov" domain={[0, 1]} format={(v) => (Number(v) * 100).toFixed(0) + '%'} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
