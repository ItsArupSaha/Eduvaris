"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { CohesionStation, CohesionQuestion } from "@/lib/exam/content-types";

/**
 * Writing Station 2 — Cohesion Builder (drag-and-drop overhaul).
 *
 * For each of 2 paragraphs the student:
 *   1. Drags the sentences into a logical order (vertical sortable list).
 *   2. Drags one transition-word chip into the gap where it belongs (or leaves
 *      it in the unused tray).
 *
 * The active paragraph is the first without a complete answer (order set +
 * transition placed). Both DnD surfaces share one DndContext; the sentence
 * sort and the chip drop are disambiguated by droppable id prefixes.
 */
export function CohesionStationView({ station }: { station: CohesionStation }) {
  // Active = first question with no committed order OR no transition placed.
  const answers = useExamStore((s) => s.answers);
  const firstIncomplete = station.questions.findIndex((q) => {
    const key = answerKey(station.id, q.id);
    const rec = answers[key];
    if (!rec || rec.payload.kind !== "cohesion") return true;
    return (
      rec.payload.orderedIndices.length !== q.scrambledSentences.length ||
      rec.payload.transitionPlacement < 0
    );
  });
  const activeIndex =
    firstIncomplete === -1 ? station.questions.length - 1 : firstIncomplete;

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        For each paragraph: drag the sentences into a logical order, then drag
        the best transition chip into the gap where it belongs.
      </p>

      <div className="space-y-6">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const isActive = qi === activeIndex;
          const isDone = !isActive && rec?.payload?.kind === "cohesion";
          return (
            <ParagraphBlock
              key={q.id}
              stationId={station.id}
              question={q}
              index={qi}
              isActive={isActive}
              isDone={!!isDone}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ Paragraph block --------------------------- */

function ParagraphBlock({
  stationId,
  question,
  index,
  isActive,
  isDone,
}: {
  stationId: string;
  question: CohesionQuestion;
  index: number;
  isActive: boolean;
  isDone: boolean;
}) {
  const answers = useExamStore((s) => s.answers);
  const setCohesion = useExamStore((s) => s.setCohesion);
  const touchQuestion = useExamStore((s) => s.touchQuestion);

  const key = answerKey(stationId, question.id);
  const rec = answers[key];
  const stored =
    rec?.payload?.kind === "cohesion"
      ? rec.payload
      : null;
  const order: number[] =
    stored && stored.orderedIndices.length > 0
      ? stored.orderedIndices
      : question.scrambledSentences.map((_, i) => i);
  const placedOption = stored?.transitionOption ?? -1;
  const placedGap = stored?.transitionPlacement ?? -1;

  // Track which chip is being dragged (for the DragOverlay ghost).
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const commit = (
    nextOrder: number[],
    nextOption: number,
    nextGap: number
  ) => {
    touchQuestion(stationId, question.id);
    setCohesion(stationId, question.id, nextOrder, nextOption, nextGap);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveChip(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveChip(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // ---- Sentence reorder (sortable) ----
    if (activeId.startsWith("sentence-") && overId.startsWith("sentence-")) {
      const fromIdx = order.indexOf(Number(activeId.replace("sentence-", "")));
      const toIdx = order.indexOf(Number(overId.replace("sentence-", "")));
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      commit(arrayMove(order, fromIdx, toIdx), placedOption, placedGap);
      return;
    }

    // ---- Transition chip drop into a gap ----
    if (activeId.startsWith("chip-") && overId.startsWith("gap-")) {
      const optionIdx = Number(activeId.replace("chip-", ""));
      const gapIdx = Number(overId.replace("gap-", ""));
      commit(order, optionIdx, gapIdx);
      return;
    }

    // ---- Transition chip returned to the tray ----
    if (activeId.startsWith("chip-") && overId === "tray") {
      commit(order, -1, -1);
      return;
    }
  };

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        isActive
          ? "border-amber-300 bg-amber-50/30 shadow-sm"
          : isDone
          ? "border-slate-200 bg-white opacity-80"
          : "border-slate-200 bg-white opacity-50"
      }`}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Paragraph {index + 1} of 2
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveChip(null)}
      >
        {/* The assembled paragraph: gap → sentence → gap → sentence → ... → gap.
            Gaps are droppable targets for the transition chip; sentences are
            sortable. */}
        <SortableContext
          items={order.map((idx) => `sentence-${idx}`)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-1">
            {order.flatMap((sentenceIdx, pos) => {
              const nodes: React.ReactNode[] = [];
              // Gap before this sentence (pos === 0 → gap 0; else the gap after
              // the previous sentence is emitted by the previous iteration, so
              // we only emit the leading gap on the first pass).
              if (pos === 0) {
                nodes.push(
                  <Gap
                    key="gap-0"
                    gapIndex={0}
                    placedOption={placedOption}
                    placedGap={placedGap}
                    options={question.transitionOptions}
                    onRemove={() => commit(order, -1, -1)}
                  />
                );
              }
              nodes.push(
                <SortableSentence
                  key={`sentence-${sentenceIdx}`}
                  id={`sentence-${sentenceIdx}`}
                  text={question.scrambledSentences[sentenceIdx]}
                  position={pos + 1}
                />
              );
              // Gap after this sentence.
              nodes.push(
                <Gap
                  key={`gap-${pos + 1}`}
                  gapIndex={pos + 1}
                  placedOption={placedOption}
                  placedGap={placedGap}
                  options={question.transitionOptions}
                  onRemove={() => commit(order, -1, -1)}
                />
              );
              return nodes;
            })}
          </ol>
        </SortableContext>

        {/* Transition chip tray */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">
            Transition words — drag the best one into the gap where it belongs:
          </p>
          <div className="flex min-h-[2.5rem] flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
            <TrayDroppable>
              {question.transitionOptions.map((opt, i) => {
                const isPlaced = placedOption === i && placedGap >= 0;
                if (isPlaced) return null;
                return <Chip key={i} id={`chip-${i}`} label={opt} />;
              })}
              {question.transitionOptions.every(
                (_, i) => placedOption === i && placedGap >= 0
              ) && (
                <span className="px-2 text-xs text-slate-400">
                  All chips placed — drag one back here to unplace it.
                </span>
              )}
            </TrayDroppable>
          </div>
        </div>

        <DragOverlay>
          {activeChip && activeChip.startsWith("chip-") ? (
            <Chip
              id={activeChip}
              label={
                question.transitionOptions[
                  Number(activeChip.replace("chip-", ""))
                ]
              }
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* --------------------------- Sortable sentence ---------------------------- */

function SortableSentence({
  id,
  text,
  position,
}: {
  id: string;
  text: string;
  position: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm active:cursor-grabbing"
    >
      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {position}
      </span>
      <span className="flex-1">{text}</span>
      <span className="flex-none select-none text-slate-300" aria-hidden>
        ⠿
      </span>
    </li>
  );
}

/* --------------------------------- Gap ------------------------------------ */

/**
 * A droppable gap between sentences (or at the edges). If a chip is placed
 * here, it renders inside the gap with a remove handle. Gaps render after each
 * sentence via the parent — but because the parent maps over a flat list, we
 * interleave gaps by rebuilding the JSX here. (See ParagraphBlock for the
 * gap-at-0 rendering; the per-sentence gaps are emitted below.)
 */
function Gap({
  gapIndex,
  placedOption,
  placedGap,
  options,
  onRemove,
}: {
  gapIndex: number;
  placedOption: number;
  placedGap: number;
  options: string[];
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `gap-${gapIndex}` });
  const hasChip = placedGap === gapIndex && placedOption >= 0;

  return (
    <li
      ref={setNodeRef}
      className={`flex min-h-[1.5rem] items-center justify-center rounded-md border border-dashed px-2 py-1 text-xs transition-colors ${
        isOver
          ? "border-amber-400 bg-amber-50"
          : hasChip
          ? "border-emerald-300 bg-emerald-50/60"
          : "border-transparent"
      }`}
    >
      {hasChip ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white">
          {options[placedOption]}
          <button
            type="button"
            onClick={onRemove}
            className="text-white/80 hover:text-white"
            aria-label="Remove transition"
          >
            ✕
          </button>
        </span>
      ) : (
        <span className="text-slate-300">drop transition here</span>
      )}
    </li>
  );
}

/* --------------------------------- Chip ----------------------------------- */

function Chip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:bg-amber-600"
      }`}
    >
      {label}
    </button>
  );
}

/* ----------------------------- Tray droppable ----------------------------- */

function TrayDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 flex-wrap items-center gap-2 rounded-md p-1 transition-colors ${
        isOver ? "bg-amber-100" : ""
      }`}
    >
      {children}
    </div>
  );
}
