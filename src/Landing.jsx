import { Circle, CircleArrowRight, CircleCheckBig, ChartColumnIncreasing, Drama, Landmark, MessageSquareText, NotebookPen, PencilLine, Swords, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithLandingGeorgeWashington } from './api/assistant';
import { renderMarkdown } from './utils/renderMarkdown';

const persona = {
  initial: 'G',
  name: 'George Washington',
  era: 'Roman Republic · 44 BC · Dictator Perpetuo',
  messages: [
    { from: 'student', text: 'Why did you cross the Rubicon? Did you not know what it would mean?' },
    { from: 'persona', text: 'I knew precisely what it meant. The Senate had stripped me of my command — and demanded my head. I chose Rome over the law, because Rome was the law.' },
    { from: 'student', text: 'Were you afraid?' },
    { from: 'persona', text: 'Fear is for men with something left to lose. I had already wagered everything on that crossing.' },
  ],
};

persona.era = 'United States · 1776 · Commander in Chief';
persona.messages = [
  { from: 'student', text: 'How did you keep the Continental Army together when supplies were so low?' },
  { from: 'persona', text: 'By reminding the men that hardship was not the exception, but the price of liberty. Discipline, patience, and example mattered as much as muskets.' },
  { from: 'student', text: 'Did you think the colonies could actually win?' },
  { from: 'persona', text: 'I believed endurance would decide more than any single battle. If we could remain in the field, the cause of independence would remain alive.' },
];

const steps = [
  { n: '01', t: 'Build a unit', d: 'Choose your topic, era, and learning objectives.' },
  { n: '02', t: 'Assign a persona', d: 'Select a historical figure tied to that moment.' },
  { n: '03', t: 'Students explore', d: 'Conversations, notes, and quizzes — all in one place.' },
  { n: '04', t: 'Review insights', d: 'Per-student AI analytics land in your dashboard.' },
];

const teacherAnalysisMockup = {
  stats: [
    { label: 'Students analyzed', value: '24', tone: 'neutral' },
    { label: 'Quiz average', value: '76%', tone: 'good' },
    { label: 'Assignment average', value: '68%', tone: 'alert' },
  ],
  summary:
    "Students show strong recall of major figures and causes of the Republic's collapse, but many still struggle to cite evidence and explain why a source is trustworthy.",
  strengths: [
    "Cause-and-effect reasoning around Caesar's rise is consistently strong across the class.",
    'Most students can identify major players and connect them to the correct events.',
  ],
  weaknesses: [
    'Source analysis responses often summarize documents instead of evaluating bias or reliability.',
    'Chronological reasoning drops on longer assignments when students sequence post-Triumvirate events.',
  ],
  recommendations: [
    'Reteach sourcing with one primary-source warm-up before the next lesson.',
    'Use a short timeline check before the unit essay to reinforce event order.',
  ],
};

const featureIconProps = { size: 16, strokeWidth: 1.9, 'aria-hidden': true };

const taskIconProps = { size: 13, strokeWidth: 2.1, 'aria-hidden': true };

function renderBackdropGraphic(variant, size) {
  switch (variant) {
    case 'dialogue': {
      const bubbleA = { x: size * 0.14, y: size * 0.18, w: size * 0.46, h: size * 0.23 };
      const bubbleB = { x: size * 0.34, y: size * 0.46, w: size * 0.5, h: size * 0.25 };

      return (
        <>
          <rect
            x={bubbleA.x}
            y={bubbleA.y}
            width={bubbleA.w}
            height={bubbleA.h}
            rx={size * 0.055}
            fill="currentColor"
            fillOpacity="0.04"
            stroke="currentColor"
            strokeWidth="1.05"
            opacity="0.76"
          />
          <path
            d={`M ${bubbleA.x + bubbleA.w * 0.2} ${bubbleA.y + bubbleA.h} l -${size * 0.055} ${size * 0.055} l ${size * 0.012} -${size * 0.07}`}
            stroke="currentColor"
            strokeWidth="1.05"
            opacity="0.76"
          />
          <line x1={bubbleA.x + size * 0.07} y1={bubbleA.y + size * 0.075} x2={bubbleA.x + bubbleA.w - size * 0.07} y2={bubbleA.y + size * 0.075} stroke="currentColor" strokeWidth="1" opacity="0.68" />
          <line x1={bubbleA.x + size * 0.07} y1={bubbleA.y + size * 0.12} x2={bubbleA.x + bubbleA.w - size * 0.12} y2={bubbleA.y + size * 0.12} stroke="currentColor" strokeWidth="0.95" opacity="0.5" />
          <line x1={bubbleA.x + size * 0.07} y1={bubbleA.y + size * 0.165} x2={bubbleA.x + bubbleA.w - size * 0.18} y2={bubbleA.y + size * 0.165} stroke="currentColor" strokeWidth="0.95" opacity="0.38" />

          <rect
            x={bubbleB.x}
            y={bubbleB.y}
            width={bubbleB.w}
            height={bubbleB.h}
            rx={size * 0.055}
            fill="currentColor"
            fillOpacity="0.026"
            stroke="currentColor"
            strokeWidth="1.05"
            opacity="0.76"
          />
          <path
            d={`M ${bubbleB.x + bubbleB.w * 0.76} ${bubbleB.y + bubbleB.h} l ${size * 0.065} ${size * 0.05} l -${size * 0.01} -${size * 0.078}`}
            stroke="currentColor"
            strokeWidth="1.05"
            opacity="0.76"
          />
          <line x1={bubbleB.x + size * 0.07} y1={bubbleB.y + size * 0.085} x2={bubbleB.x + bubbleB.w - size * 0.08} y2={bubbleB.y + size * 0.085} stroke="currentColor" strokeWidth="1" opacity="0.68" />
          <line x1={bubbleB.x + size * 0.07} y1={bubbleB.y + size * 0.13} x2={bubbleB.x + bubbleB.w - size * 0.16} y2={bubbleB.y + size * 0.13} stroke="currentColor" strokeWidth="0.95" opacity="0.5" />
          <line x1={bubbleB.x + size * 0.07} y1={bubbleB.y + size * 0.175} x2={bubbleB.x + bubbleB.w - size * 0.11} y2={bubbleB.y + size * 0.175} stroke="currentColor" strokeWidth="0.95" opacity="0.38" />

          <path
            d={`M ${size * 0.42} ${size * 0.42} C ${size * 0.47} ${size * 0.46}, ${size * 0.53} ${size * 0.5}, ${size * 0.58} ${size * 0.54}`}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray={`${size * 0.016} ${size * 0.022}`}
            opacity="0.6"
          />
        </>
      );
    }

    case 'analysis': {
      const bars = [
        { x: size * 0.27, y: size * 0.58, h: size * 0.2 },
        { x: size * 0.41, y: size * 0.43, h: size * 0.35 },
        { x: size * 0.55, y: size * 0.5, h: size * 0.28 },
      ];
      const points = [
        [size * 0.22, size * 0.63],
        [size * 0.36, size * 0.5],
        [size * 0.5, size * 0.56],
        [size * 0.64, size * 0.36],
        [size * 0.78, size * 0.3],
      ];

      return (
        <>
          <path d={`M ${size * 0.18} ${size * 0.78} H ${size * 0.82} M ${size * 0.18} ${size * 0.78} V ${size * 0.22}`} stroke="currentColor" strokeWidth="1.15" opacity="0.78" />
          {[0.62, 0.46, 0.3].map(y => (
            <line key={y} x1={size * 0.18} y1={size * y} x2={size * 0.82} y2={size * y} stroke="currentColor" strokeWidth="0.9" strokeDasharray={`${size * 0.014} ${size * 0.02}`} opacity="0.32" />
          ))}
          {bars.map(bar => (
            <rect
              key={bar.x}
              x={bar.x}
              y={bar.y}
              width={size * 0.085}
              height={bar.h}
              rx={size * 0.02}
              fill="currentColor"
              fillOpacity="0.05"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.78"
            />
          ))}
          <polyline points={points.map(([x, y]) => `${x},${y}`).join(' ')} stroke="currentColor" strokeWidth="1.15" fill="none" opacity="0.8" />
          {points.map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x - size * 0.012}
              y={y - size * 0.012}
              width={size * 0.024}
              height={size * 0.024}
              transform={`rotate(45 ${x} ${y})`}
              fill="currentColor"
              fillOpacity="0.06"
              stroke="currentColor"
              strokeWidth="0.95"
              opacity="0.84"
            />
          ))}
          <rect x={size * 0.61} y={size * 0.14} width={size * 0.17} height={size * 0.08} rx={size * 0.022} fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1" opacity="0.68" />
          <line x1={size * 0.645} y1={size * 0.18} x2={size * 0.745} y2={size * 0.18} stroke="currentColor" strokeWidth="0.95" opacity="0.56" />
        </>
      );
    }

    case 'curriculum': {
      const backCenterX = size * 0.38;
      const backCenterY = size * 0.5;
      const frontCenterX = size * 0.58;
      const frontCenterY = size * 0.52;

      return (
        <>
          <g transform={`rotate(-11 ${backCenterX} ${backCenterY})`}>
            <rect x={size * 0.14} y={size * 0.2} width={size * 0.42} height={size * 0.54} rx={size * 0.04} fill="currentColor" fillOpacity="0.024" stroke="currentColor" strokeWidth="1" opacity="0.56" />
            <line x1={size * 0.2} y1={size * 0.3} x2={size * 0.47} y2={size * 0.3} stroke="currentColor" strokeWidth="0.95" opacity="0.42" />
            <line x1={size * 0.2} y1={size * 0.38} x2={size * 0.42} y2={size * 0.38} stroke="currentColor" strokeWidth="0.9" opacity="0.32" />
          </g>
          <g transform={`rotate(6 ${frontCenterX} ${frontCenterY})`}>
            <rect x={size * 0.31} y={size * 0.18} width={size * 0.44} height={size * 0.58} rx={size * 0.045} fill="currentColor" fillOpacity="0.038" stroke="currentColor" strokeWidth="1.05" opacity="0.78" />
            <rect x={size * 0.36} y={size * 0.24} width={size * 0.18} height={size * 0.07} rx={size * 0.018} fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="0.95" opacity="0.72" />
            <line x1={size * 0.36} y1={size * 0.37} x2={size * 0.69} y2={size * 0.37} stroke="currentColor" strokeWidth="1" opacity="0.62" />
            <line x1={size * 0.36} y1={size * 0.44} x2={size * 0.66} y2={size * 0.44} stroke="currentColor" strokeWidth="0.95" opacity="0.44" />
            <line x1={size * 0.36} y1={size * 0.51} x2={size * 0.62} y2={size * 0.51} stroke="currentColor" strokeWidth="0.95" opacity="0.34" />
            <path d={`M ${size * 0.36} ${size * 0.63} H ${size * 0.68} M ${size * 0.44} ${size * 0.59} V ${size * 0.67} M ${size * 0.54} ${size * 0.59} V ${size * 0.67} M ${size * 0.62} ${size * 0.59} V ${size * 0.67}`} stroke="currentColor" strokeWidth="0.95" opacity="0.54" />
          </g>
        </>
      );
    }

    case 'journey': {
      const checkpoints = [
        { x: size * 0.2, y: size * 0.74, w: size * 0.11 },
        { x: size * 0.42, y: size * 0.56, w: size * 0.14 },
        { x: size * 0.62, y: size * 0.64, w: size * 0.12 },
        { x: size * 0.79, y: size * 0.34, w: size * 0.1 },
      ];

      return (
        <>
          <path
            d={`M ${size * 0.16} ${size * 0.76} C ${size * 0.25} ${size * 0.71}, ${size * 0.29} ${size * 0.55}, ${size * 0.41} ${size * 0.56} S ${size * 0.61} ${size * 0.73}, ${size * 0.79} ${size * 0.34}`}
            stroke="currentColor"
            strokeWidth="1.18"
            fill="none"
            opacity="0.78"
          />
          {checkpoints.map(point => (
            <g key={`${point.x}-${point.y}`}>
              <circle cx={point.x} cy={point.y} r={size * 0.02} fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1" opacity="0.84" />
              <line x1={point.x + size * 0.045} y1={point.y} x2={point.x + size * 0.045 + point.w} y2={point.y} stroke="currentColor" strokeWidth="0.95" opacity="0.56" />
            </g>
          ))}
          <path d={`M ${size * 0.79} ${size * 0.34} V ${size * 0.22} l ${size * 0.08} ${size * 0.035} l -${size * 0.08} ${size * 0.035}`} stroke="currentColor" strokeWidth="1.05" opacity="0.72" fill="currentColor" fillOpacity="0.04" />
        </>
      );
    }

    case 'assistant': {
      const nodes = [
        [size * 0.67, size * 0.4],
        [size * 0.77, size * 0.3],
        [size * 0.78, size * 0.55],
        [size * 0.67, size * 0.66],
      ];

      return (
        <>
          <rect x={size * 0.18} y={size * 0.2} width={size * 0.64} height={size * 0.56} rx={size * 0.045} fill="currentColor" fillOpacity="0.024" stroke="currentColor" strokeWidth="1.05" opacity="0.74" />
          <line x1={size * 0.18} y1={size * 0.3} x2={size * 0.82} y2={size * 0.3} stroke="currentColor" strokeWidth="1" opacity="0.5" />
          {[0.24, 0.28, 0.32].map(x => (
            <circle key={x} cx={size * x} cy={size * 0.25} r={size * 0.008} fill="currentColor" fillOpacity="0.7" opacity="0.78" />
          ))}
          <polyline
            points={[
              [size * 0.24, size * 0.54],
              [size * 0.31, size * 0.5],
              [size * 0.38, size * 0.58],
              [size * 0.45, size * 0.42],
              [size * 0.53, size * 0.5],
              [size * 0.6, size * 0.36],
            ].map(([x, y]) => `${x},${y}`).join(' ')}
            stroke="currentColor"
            strokeWidth="1.1"
            fill="none"
            opacity="0.78"
          />
          <path d={`M ${size * 0.25} ${size * 0.65} H ${size * 0.43} M ${size * 0.25} ${size * 0.7} H ${size * 0.39}`} stroke="currentColor" strokeWidth="0.95" opacity="0.4" />
          <path d={`M ${nodes[0][0]} ${nodes[0][1]} L ${nodes[1][0]} ${nodes[1][1]} L ${nodes[2][0]} ${nodes[2][1]} L ${nodes[3][0]} ${nodes[3][1]} Z M ${nodes[0][0]} ${nodes[0][1]} L ${nodes[2][0]} ${nodes[2][1]}`} stroke="currentColor" strokeWidth="0.95" opacity="0.54" fill="none" />
          {nodes.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={size * 0.017} fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="0.95" opacity="0.78" />
          ))}
        </>
      );
    }

    case 'process': {
      const steps = [
        { x: size * 0.22, y: size * 0.34 },
        { x: size * 0.42, y: size * 0.54 },
        { x: size * 0.62, y: size * 0.34 },
        { x: size * 0.8, y: size * 0.54 },
      ];

      return (
        <>
          <polyline points={steps.map(step => `${step.x},${step.y}`).join(' ')} stroke="currentColor" strokeWidth="1.12" fill="none" opacity="0.76" />
          {steps.map((step, index) => (
            <g key={`${step.x}-${step.y}`}>
              <rect
                x={step.x - size * 0.024}
                y={step.y - size * 0.024}
                width={size * 0.048}
                height={size * 0.048}
                transform={`rotate(45 ${step.x} ${step.y})`}
                fill="currentColor"
                fillOpacity={index === 1 || index === 3 ? '0.06' : '0.03'}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.82"
              />
              <line x1={step.x} y1={step.y + size * 0.06} x2={step.x} y2={step.y + size * 0.12} stroke="currentColor" strokeWidth="0.95" opacity="0.48" />
              <line x1={step.x - size * 0.05} y1={step.y + size * 0.14} x2={step.x + size * 0.05} y2={step.y + size * 0.14} stroke="currentColor" strokeWidth="0.9" opacity="0.34" />
            </g>
          ))}
        </>
      );
    }

    case 'seal': {
      const center = size * 0.5;
      const outer = size * 0.17;
      const inner = size * 0.09;

      return (
        <>
          {[0, 45, 90, 135].map(angle => (
            <g key={angle} transform={`rotate(${angle} ${center} ${center})`}>
              <line x1={center} y1={size * 0.14} x2={center} y2={size * 0.26} stroke="currentColor" strokeWidth="1.05" opacity="0.66" />
              <line x1={center} y1={size * 0.74} x2={center} y2={size * 0.86} stroke="currentColor" strokeWidth="1.05" opacity="0.66" />
            </g>
          ))}
          <path d={`M ${center} ${center - outer} L ${center + outer} ${center} L ${center} ${center + outer} L ${center - outer} ${center} Z`} fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.05" opacity="0.8" />
          <path d={`M ${center} ${center - inner} L ${center + inner} ${center} L ${center} ${center + inner} L ${center - inner} ${center} Z`} stroke="currentColor" strokeWidth="1" opacity="0.72" />
          <path d={`M ${center - size * 0.045} ${center} H ${center + size * 0.045} M ${center} ${center - size * 0.045} V ${center + size * 0.045}`} stroke="currentColor" strokeWidth="0.95" opacity="0.6" />
          <path d={`M ${center - size * 0.12} ${center + size * 0.17} l -${size * 0.09} ${size * 0.05} l ${size * 0.03} ${size * 0.06} l ${size * 0.11} -${size * 0.06}`} stroke="currentColor" strokeWidth="1" opacity="0.62" fill="currentColor" fillOpacity="0.028" />
          <path d={`M ${center + size * 0.12} ${center + size * 0.17} l ${size * 0.09} ${size * 0.05} l -${size * 0.03} ${size * 0.06} l -${size * 0.11} -${size * 0.06}`} stroke="currentColor" strokeWidth="1" opacity="0.62" fill="currentColor" fillOpacity="0.028" />
        </>
      );
    }

    case 'compass': {
      const cx = size * 0.5;
      const cy = size * 0.5;
      const rOuter = size * 0.36;
      const rMid = size * 0.24;
      const rInner = size * 0.1;
      const pts = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? rOuter : rMid;
        return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
      }).join(' ');
      return (
        <>
          <circle cx={cx} cy={cy} r={rOuter + size * 0.07} stroke="currentColor" strokeWidth="0.82" strokeDasharray={`${size * 0.016} ${size * 0.012}`} opacity="0.44" fill="none" />
          <circle cx={cx} cy={cy} r={rOuter + size * 0.01} stroke="currentColor" strokeWidth="0.7" opacity="0.3" fill="none" />
          <polygon points={pts} fill="currentColor" fillOpacity="0.045" stroke="currentColor" strokeWidth="1.1" opacity="0.82" />
          {[0, 90, 180, 270].map(deg => {
            const rad = (deg - 90) * Math.PI / 180;
            return (
              <line
                key={deg}
                x1={cx + Math.cos(rad) * (rOuter + size * 0.07)}
                y1={cy + Math.sin(rad) * (rOuter + size * 0.07)}
                x2={cx + Math.cos(rad) * (rOuter + size * 0.12)}
                y2={cy + Math.sin(rad) * (rOuter + size * 0.12)}
                stroke="currentColor" strokeWidth="1.1" opacity="0.7"
              />
            );
          })}
          {[45, 135, 225, 315].map(deg => {
            const rad = (deg - 90) * Math.PI / 180;
            return (
              <line
                key={deg}
                x1={cx + Math.cos(rad) * (rOuter + size * 0.035)}
                y1={cy + Math.sin(rad) * (rOuter + size * 0.035)}
                x2={cx + Math.cos(rad) * (rOuter + size * 0.065)}
                y2={cy + Math.sin(rad) * (rOuter + size * 0.065)}
                stroke="currentColor" strokeWidth="0.9" opacity="0.5"
              />
            );
          })}
          <circle cx={cx} cy={cy} r={rInner} fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.05" opacity="0.84" />
          <circle cx={cx} cy={cy} r={size * 0.026} fill="currentColor" fillOpacity="0.14" />
        </>
      );
    }

    case 'scroll': {
      const sl = size * 0.17;
      const sr = size * 0.83;
      const st = size * 0.27;
      const sb = size * 0.73;
      const rollRx = (sr - sl) / 2;
      const rollRy = size * 0.075;
      return (
        <>
          <rect x={sl} y={st} width={sr - sl} height={sb - st} rx={size * 0.018} fill="currentColor" fillOpacity="0.035" stroke="currentColor" strokeWidth="1.05" opacity="0.76" />
          <ellipse cx={size * 0.5} cy={st} rx={rollRx} ry={rollRy} fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.05" opacity="0.76" />
          <ellipse cx={size * 0.5} cy={sb} rx={rollRx} ry={rollRy} fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.05" opacity="0.76" />
          <ellipse cx={size * 0.5} cy={st} rx={rollRx - size * 0.04} ry={rollRy * 0.42} fill="none" stroke="currentColor" strokeWidth="0.82" opacity="0.34" />
          <ellipse cx={size * 0.5} cy={sb} rx={rollRx - size * 0.04} ry={rollRy * 0.42} fill="none" stroke="currentColor" strokeWidth="0.82" opacity="0.34" />
          {[0.38, 0.44, 0.5, 0.56, 0.62].map((y, i) => (
            <line key={y} x1={sl + size * 0.07} y1={size * y} x2={sr - size * (0.06 + i * 0.025)} y2={size * y} stroke="currentColor" strokeWidth="0.9" opacity={0.44 - i * 0.04} />
          ))}
        </>
      );
    }

    case 'quill': {
      return (
        <>
          <path
            d={`M ${size*0.68} ${size*0.13} C ${size*0.88} ${size*0.18} ${size*0.85} ${size*0.38} ${size*0.7} ${size*0.5} C ${size*0.55} ${size*0.62} ${size*0.4} ${size*0.72} ${size*0.28} ${size*0.9} L ${size*0.36} ${size*0.76} C ${size*0.44} ${size*0.64} ${size*0.54} ${size*0.56} ${size*0.67} ${size*0.46} C ${size*0.8} ${size*0.36} ${size*0.82} ${size*0.22} ${size*0.68} ${size*0.13}`}
            fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeWidth="1.05" opacity="0.78"
          />
          <path
            d={`M ${size*0.68} ${size*0.13} Q ${size*0.57} ${size*0.47} ${size*0.28} ${size*0.9}`}
            stroke="currentColor" strokeWidth="0.92" fill="none" opacity="0.54"
          />
          {[[0.64,0.28,0.73,0.22],[0.6,0.34,0.7,0.3],[0.55,0.42,0.65,0.38],[0.5,0.5,0.6,0.47],[0.44,0.58,0.54,0.55],[0.39,0.66,0.48,0.63]].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={size*x1} y1={size*y1} x2={size*x2} y2={size*y2} stroke="currentColor" strokeWidth="0.86" opacity="0.38" />
          ))}
          {[[0.64,0.28,0.55,0.34],[0.6,0.34,0.51,0.38],[0.55,0.42,0.46,0.46],[0.5,0.5,0.41,0.54],[0.44,0.58,0.35,0.62]].map(([x1,y1,x2,y2],i) => (
            <line key={`b${i}`} x1={size*x1} y1={size*y1} x2={size*x2} y2={size*y2} stroke="currentColor" strokeWidth="0.82" opacity="0.3" />
          ))}
          <path d={`M ${size*0.28} ${size*0.9} L ${size*0.21} ${size*0.84} L ${size*0.33} ${size*0.77}`} stroke="currentColor" strokeWidth="1" opacity="0.68" fill="currentColor" fillOpacity="0.05" />
        </>
      );
    }

    case 'laurel': {
      const cx = size * 0.5;
      const cy = size * 0.52;
      const r = size * 0.28;
      const lw = size * 0.062;
      const lh = size * 0.026;
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (-65 + i * 26) * Math.PI / 180;
            const lx = cx + Math.cos(Math.PI - angle) * r;
            const ly = cy + Math.sin(Math.PI - angle) * r;
            const rot = (Math.PI - angle) * 180 / Math.PI + 90;
            return <ellipse key={`l${i}`} cx={lx} cy={ly} rx={lw} ry={lh} transform={`rotate(${rot} ${lx} ${ly})`} fill="currentColor" fillOpacity="0.046" stroke="currentColor" strokeWidth="0.96" opacity="0.64" />;
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (-65 + i * 26) * Math.PI / 180;
            const lx = cx + Math.cos(angle) * r;
            const ly = cy + Math.sin(angle) * r;
            const rot = angle * 180 / Math.PI + 90;
            return <ellipse key={`r${i}`} cx={lx} cy={ly} rx={lw} ry={lh} transform={`rotate(${rot} ${lx} ${ly})`} fill="currentColor" fillOpacity="0.046" stroke="currentColor" strokeWidth="0.96" opacity="0.64" />;
          })}
          <path d={`M ${cx - r*0.9} ${cy + r*0.3} A ${r} ${r} 0 0 1 ${cx + r*0.9} ${cy + r*0.3}`} stroke="currentColor" strokeWidth="0.82" fill="none" opacity="0.3" strokeDasharray={`${size*0.013} ${size*0.018}`} />
          <path d={`M ${cx - size*0.09} ${cy + r*0.68} C ${cx - size*0.03} ${cy + r*0.62} ${cx + size*0.03} ${cy + r*0.62} ${cx + size*0.09} ${cy + r*0.68}`} stroke="currentColor" strokeWidth="1.02" fill="none" opacity="0.56" />
          <circle cx={cx} cy={cy - r*0.14} r={size * 0.018} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.9" opacity="0.64" />
        </>
      );
    }

    default:
      return null;
  }
}

function SectionBackdrop({ className = '', size = 320, variant = 'dialogue' }) {

  return (
    <div className={`section-backdrop section-backdrop-${variant} ${className}`.trim()} style={{ '--backdrop-size': `${size}px` }} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderBackdropGraphic(variant, size)}
      </svg>
    </div>
  );
}

function HeroGear({ size = 200, teeth = 14 }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.34;
  const hubR = size * 0.11;
  const halfPeriod = Math.PI / teeth;
  const halfTooth = halfPeriod * 0.42;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const theta = (i / teeth) * 2 * Math.PI - Math.PI / 2;
    const a1 = theta - halfPeriod + halfTooth;
    const a2 = theta - halfTooth;
    const a3 = theta + halfTooth;
    const a4 = theta + halfPeriod - halfTooth;
    pts.push(
      `${cx + Math.cos(a1) * innerR},${cy + Math.sin(a1) * innerR}`,
      `${cx + Math.cos(a2) * outerR},${cy + Math.sin(a2) * outerR}`,
      `${cx + Math.cos(a3) * outerR},${cy + Math.sin(a3) * outerR}`,
      `${cx + Math.cos(a4) * innerR},${cy + Math.sin(a4) * innerR}`,
    );
  }
  const gearD = `M ${pts.join(' L ')} Z`;
  const holeD = `M ${cx + hubR} ${cy} A ${hubR} ${hubR} 0 1 0 ${cx - hubR} ${cy} A ${hubR} ${hubR} 0 1 0 ${cx + hubR} ${cy} Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d={`${gearD} ${holeD}`}
        fill="currentColor" fillOpacity="0.07"
        stroke="currentColor" strokeWidth={size * 0.014} strokeOpacity="0.82"
        fillRule="evenodd"
      />
      {[0, 60, 120].map(deg => {
        const r = deg * Math.PI / 180;
        const re = innerR * 0.82;
        return (
          <line key={deg}
            x1={cx - Math.cos(r) * re} y1={cy - Math.sin(r) * re}
            x2={cx + Math.cos(r) * re} y2={cy + Math.sin(r) * re}
            stroke="currentColor" strokeWidth={size * 0.022} strokeOpacity="0.52" strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={hubR}
        fill="currentColor" fillOpacity="0.05"
        stroke="currentColor" strokeWidth={size * 0.012} strokeOpacity="0.74"
      />
    </svg>
  );
}

function getClockAngles(offsetMinutes) {
  const now = new Date(Date.now() + offsetMinutes * 60000);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return {
    hour: h * 30,
    minute: m * 6,
    second: s * 6,
  };
}

function HeroClock({ size = 200, offsetMinutes = 0 }) {
  const cx = size / 2;
  const cy = size / 2;
  const faceR = size * 0.43;
  const hourLen = size * 0.25;
  const minLen = size * 0.33;
  const secLen = size * 0.38;

  const [angles, setAngles] = useState(() => getClockAngles(offsetMinutes));

  useEffect(() => {
    const tick = () => setAngles(getClockAngles(offsetMinutes));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offsetMinutes]);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const isHour = i % 5 === 0;
    const r1 = isHour ? faceR * 0.82 : faceR * 0.9;
    return {
      x1: cx + Math.cos(angle) * r1,
      y1: cy + Math.sin(angle) * r1,
      x2: cx + Math.cos(angle) * faceR,
      y2: cy + Math.sin(angle) * faceR,
      isHour,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round">
      <circle cx={cx} cy={cy} r={faceR + size * 0.025} stroke="currentColor" strokeWidth={size * 0.022} fill="none" strokeOpacity="0.84" />
      <circle cx={cx} cy={cy} r={faceR} fill="currentColor" fillOpacity="0.03" />
      <circle cx={cx} cy={cy} r={faceR - size * 0.015} stroke="currentColor" strokeWidth={size * 0.006} fill="none" strokeOpacity="0.22" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="currentColor"
          strokeWidth={t.isHour ? size * 0.02 : size * 0.007}
          strokeOpacity={t.isHour ? 0.8 : 0.36}
        />
      ))}
      <g transform={`rotate(${angles.hour} ${cx} ${cy})`}>
        <line x1={cx} y1={cy + size * 0.05} x2={cx} y2={cy - hourLen}
          stroke="currentColor" strokeWidth={size * 0.028} strokeLinecap="round" strokeOpacity="0.84" />
      </g>
      <g transform={`rotate(${angles.minute} ${cx} ${cy})`}>
        <line x1={cx} y1={cy + size * 0.05} x2={cx} y2={cy - minLen}
          stroke="currentColor" strokeWidth={size * 0.016} strokeLinecap="round" strokeOpacity="0.72" />
      </g>
      <g transform={`rotate(${angles.second} ${cx} ${cy})`}>
        <line x1={cx} y1={cy + size * 0.07} x2={cx} y2={cy - secLen}
          stroke="currentColor" strokeWidth={size * 0.007} strokeLinecap="round" strokeOpacity="0.55" />
      </g>
      <circle cx={cx} cy={cy} r={size * 0.026} fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

const sessionTasks = [
  { Icon: CircleCheckBig, cls: 'm-task-done', title: 'Primary Source Reading', sub: 'Completed · 8 min read' },
  { Icon: CircleCheckBig, cls: 'm-task-done', title: 'Conversation with Caesar', sub: '4 exchanges · Saved to notes' },
  { Icon: CircleArrowRight, cls: 'm-task-active', title: 'Knowledge Check', sub: '5 questions · In progress' },
  { Icon: Circle, cls: 'm-task-pend', title: 'Personal Reflection', sub: 'Not started' },
];

export default function Landing() {
  const navigate = useNavigate();
  const showLegacyClassInsights = false;
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [showTyping, setShowTyping] = useState(false);
  const [studentDraft, setStudentDraft] = useState('');
  const [studentComposing, setStudentComposing] = useState(false);
  const [studentSending, setStudentSending] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [demoReplying, setDemoReplying] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const messagesContainerRef = useRef(null);
  const personaRef = useRef(null);
  const chatStarted = useRef(false);
  const chatTimers = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.rev').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!personaRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !chatStarted.current) {
        chatStarted.current = true;
        const ts = [];
        let delay = 400;

        setVisibleMessages([]);
        setShowTyping(false);
        setStudentDraft('');
        setStudentComposing(false);
        setStudentSending(false);
        setDemoReady(false);
        setDemoInput('');
        setDemoReplying(false);

        persona.messages.forEach(msg => {
          if (msg.from === 'persona') {
            ts.push(setTimeout(() => setShowTyping(true), delay));
            delay += 1000;
            ts.push(setTimeout(() => {
              setShowTyping(false);
              setVisibleMessages(p => [...p, msg]);
            }, delay));
          } else {
            ts.push(setTimeout(() => {
              setStudentComposing(true);
              setStudentSending(false);
              setStudentDraft('');
            }, delay));

            const typeStartDelay = delay + 120;
            const charDelay = 22;
            msg.text.split('').forEach((_, i) => {
              ts.push(setTimeout(() => setStudentDraft(msg.text.slice(0, i + 1)), typeStartDelay + (i * charDelay)));
            });

            delay = typeStartDelay + (msg.text.length * charDelay);
            ts.push(setTimeout(() => setStudentSending(true), delay + 140));
            ts.push(setTimeout(() => {
              setVisibleMessages(p => [...p, msg]);
              setStudentDraft('');
              setStudentComposing(false);
              setStudentSending(false);
            }, delay + 380));
          }
          delay += 700;
        });
        ts.push(setTimeout(() => setDemoReady(true), delay + 160));
        chatTimers.current = ts;
      }
    }, { threshold: 0.35 });
    obs.observe(personaRef.current);
    return () => {
      obs.disconnect();
      chatTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages, showTyping, studentDraft, studentComposing, studentSending, demoReplying]);

  function handleDemoSubmit(event) {
    event?.preventDefault?.();

    const nextMessage = demoInput.trim();
    if (!nextMessage || !demoReady || showTyping || studentComposing || demoReplying) return;

    const nextTranscript = [...visibleMessages, { from: 'student', text: nextMessage }];
    setVisibleMessages(nextTranscript);
    setDemoInput('');
    setDemoReplying(true);
    setShowTyping(true);

    const transcriptForApi = nextTranscript.map((message) => ({
      role: message.from === 'persona' ? 'assistant' : 'user',
      content: message.text,
    }));

    chatWithLandingGeorgeWashington(transcriptForApi)
      .then(({ reply }) => {
        setVisibleMessages(current => [...current, { from: 'persona', text: reply || 'I would answer you plainly, if you put the question again.' }]);
      })
      .catch(() => {
        setVisibleMessages(current => [...current, { from: 'persona', text: 'The line from camp is faint just now. Ask me again in a moment.' }]);
      })
      .finally(() => {
        setShowTyping(false);
        setDemoReplying(false);
      });
  }

  const hl = heroLoaded;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#ece1d1', color: '#0f0e0d', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lp: #ece1d1; --lp2: #e2d6c6; --lp3: #d4c5b2;
          --li: #0f0e0d; --li7: rgba(15,14,13,.7); --li5: rgba(15,14,13,.5); --li3: rgba(15,14,13,.3);
          --lr: #b84c2b; --lr-d: #8f3a1f;
          --lb: #cabcaa; --lb-h: rgba(15,14,13,.16);
          --ld: 'Playfair Display', Georgia, serif;
          --ls: 'DM Sans', sans-serif;
        }

        /* ── NAV ── */
        .ln { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 60px; background: var(--li); border-bottom: 2px solid var(--lr); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; }
        .ln-brand { font-family: var(--ld); font-size: 21px; font-weight: 600; color: var(--lp); }
        .ln-brand-dot { color: var(--lr); }
        .ln-nav { display: flex; gap: 32px; }
        .ln-nav-btn { font-family: var(--ls); font-size: 12px; color: rgba(245,240,232,.48); background: none; border: none; cursor: pointer; transition: color .18s; padding: 0; }
        .ln-nav-btn:hover { color: var(--lp); }
        .ln-right { display: flex; gap: 12px; align-items: center; }
        .ln-si { font-family: var(--ls); font-size: 12px; color: rgba(245,240,232,.48); background: none; border: none; cursor: pointer; transition: color .18s; padding: 0; }
        .ln-si:hover { color: var(--lp); }
        .ln-cta { font-family: var(--ls); font-size: 12px; font-weight: 500; padding: 8px 20px; background: var(--lr); color: #fff; border: none; cursor: pointer; transition: background .2s, transform .18s; border-radius: 4px; }
        .ln-cta:hover { background: var(--lr-d); transform: translateY(-1px); }

        /* ── HERO ── */
        .lhero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 100px 24px 80px; background: linear-gradient(180deg, #eee3d4 0%, var(--lp) 48%, #ddd0be 100%); position: relative; overflow: hidden; }
        .lhero::after { content: ''; position: absolute; inset: 0; background-image: linear-gradient(135deg, rgba(255,255,255,.18) 0%, transparent 42%), radial-gradient(circle at 22% 78%, rgba(184,76,43,.08) 0%, transparent 48%), radial-gradient(circle at 78% 22%, rgba(118,92,66,.08) 0%, transparent 46%); pointer-events: none; }
        .lh-ornament { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; opacity: 0; transform: translateY(8px); transition: opacity .6s .08s, transform .6s .08s; }
        .lh-ornament.in { opacity: 1; transform: translateY(0); }
        .lh-orn-line { width: 40px; height: 1px; background: var(--lr); opacity: .5; }
        .lh-orn-text { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--lr); }
        .lh-headline { font-family: var(--ld); font-size: clamp(52px, 9vw, 118px); font-weight: 600; line-height: .96; color: var(--li); margin-bottom: 8px; opacity: 0; transform: translateY(22px); transition: opacity .95s .28s, transform .95s .28s cubic-bezier(.16,1,.3,1); }
        .lh-headline.in { opacity: 1; transform: translateY(0); }
        .lh-headline-em { display: block; font-style: italic; color: var(--lr); }
        .lh-sep { display: flex; align-items: center; gap: 12px; max-width: 260px; margin: 22px auto; opacity: 0; transition: opacity .6s .5s; }
        .lh-sep.in { opacity: 1; }
        .lh-sep::before, .lh-sep::after { content: ''; flex: 1; height: 1px; background: var(--lb); }
        .lh-sep-diamond { width: 5px; height: 5px; background: var(--lr); transform: rotate(45deg); flex-shrink: 0; }
        .lh-desc { font-family: var(--ls); font-size: clamp(14px, 1.6vw, 17px); font-weight: 300; line-height: 1.8; color: var(--li7); max-width: 480px; margin: 0 auto 40px; opacity: 0; transform: translateY(10px); transition: opacity .7s .58s, transform .7s .58s; }
        .lh-desc.in { opacity: 1; transform: translateY(0); }
        .lh-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; opacity: 0; transform: translateY(10px); transition: opacity .7s .72s, transform .7s .72s; }
        .lh-btns.in { opacity: 1; transform: translateY(0); }
        .lh-scroll-cue { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 7px; opacity: 0; transition: opacity 1s 1.3s; font-family: var(--ls); font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--li3); z-index: 2; }
        .lh-scroll-cue.in { opacity: 1; }
        .scroll-bar { width: 1px; height: 34px; background: linear-gradient(to bottom, var(--lr), transparent); animation: sbar 2s ease-in-out infinite; }
        @keyframes sbar { 0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}50.01%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom} }

        /* ── BUTTONS ── */
        .btn-rust { font-family: var(--ls); font-size: 13px; font-weight: 500; padding: 13px 40px; background: var(--lr); color: #fff; border: none; cursor: pointer; border-radius: 4px; transition: background .2s, transform .2s, box-shadow .2s; white-space: nowrap; }
        .btn-rust:hover { background: var(--lr-d); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(184,76,43,.26); }
        .btn-ghost { font-family: var(--ls); font-size: 13px; font-weight: 400; padding: 13px 40px; background: transparent; color: var(--li7); border: 1px solid var(--lb-h); cursor: pointer; border-radius: 4px; transition: border-color .2s, color .2s; white-space: nowrap; }
        .btn-ghost:hover { border-color: var(--lr); color: var(--lr); }
        .btn-parchment { font-family: var(--ls); font-size: 13px; font-weight: 500; padding: 13px 44px; background: var(--lp); color: var(--li); border: none; cursor: pointer; border-radius: 4px; transition: background .2s, transform .2s; white-space: nowrap; }
        .btn-parchment:hover { background: var(--lp2); transform: translateY(-2px); }
        .btn-ghost-dk { font-family: var(--ls); font-size: 13px; font-weight: 400; padding: 13px 44px; background: transparent; color: rgba(245,240,232,.55); border: 1px solid rgba(245,240,232,.18); cursor: pointer; border-radius: 4px; transition: border-color .2s, color .2s; white-space: nowrap; }
        .btn-ghost-dk:hover { border-color: rgba(245,240,232,.45); color: var(--lp); }

        /* ── SECTION SHARED ── */
        .sec-wrap { max-width: 1160px; margin: 0 auto; padding: 0 40px; }
        .sec-label { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; color: var(--lr); margin-bottom: 10px; }
        .sec-h { font-family: var(--ld); font-size: clamp(32px, 4.5vw, 54px); font-weight: 600; line-height: 1.1; color: var(--li); }
        .sec-h em { font-style: italic; color: var(--lr); }
        .sec-p { font-family: var(--ls); font-size: 14px; font-weight: 300; line-height: 1.8; color: var(--li7); margin-top: 12px; }

        /* ── PERSONA DEMO ── */
        .ldemo { background: var(--lp2); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); padding: 96px 24px; position: relative; overflow: hidden; }
        .ldemo-inner { max-width: 660px; margin: 0 auto; position: relative; z-index: 1; }
        .ldemo-header { text-align: center; margin-bottom: 40px; }
        .ldemo-header .sec-p { max-width: 520px; margin: 12px auto 0; text-align: center; }
        .pc { background: #fff; border: 1px solid var(--lb); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(15,14,13,.09); }
        .pc-top { padding: 12px 18px; background: var(--lp); border-bottom: 1px solid var(--lb); display: flex; align-items: center; justify-content: space-between; }
        .pc-top-label { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--li5); }
        .pc-live { display: flex; align-items: center; gap: 6px; font-family: var(--ls); font-size: 10px; font-weight: 500; color: #1B6358; letter-spacing: .08em; text-transform: uppercase; }
        .pc-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #1B6358; animation: pdot 2s ease-in-out infinite; }
        @keyframes pdot { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.55)} }
        .pc-identity { display: flex; align-items: center; gap: 14px; padding: 18px 18px 0; }
        .pc-avatar { width: 44px; height: 44px; border-radius: 6px; background: rgba(184,76,43,.09); border: 1px solid rgba(184,76,43,.2); display: flex; align-items: center; justify-content: center; font-family: var(--ld); font-size: 20px; font-style: italic; color: var(--lr); flex-shrink: 0; }
        .pc-pname { font-family: var(--ld); font-size: 16px; font-weight: 600; color: var(--li); }
        .pc-pera { font-family: var(--ls); font-size: 10px; font-weight: 400; color: var(--li5); margin-top: 3px; }
        .pc-body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 9px; height: 270px; overflow-y: scroll; }
        .pc-body::-webkit-scrollbar { width: 3px; } .pc-body::-webkit-scrollbar-thumb { background: var(--lr); border-radius: 2px; }
        .mr-s { display: flex; justify-content: flex-end; } .mr-p { display: flex; justify-content: flex-start; }
        .bubble { padding: 10px 14px; font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.68; max-width: 82%; animation: bIn .25s ease both; }
        @keyframes bIn { from{opacity:0}to{opacity:1} }
        .bubble-s { background: rgba(184,76,43,.08); border: 1px solid rgba(184,76,43,.18); color: var(--li7); border-radius: 10px 10px 2px 10px; }
        .bubble-p { background: var(--lp2); border: 1px solid var(--lb); border-left: 2px solid var(--lr); color: var(--li7); border-radius: 10px 10px 10px 2px; }
        .typing-row { display: flex; justify-content: flex-start; }
        .typing-ind { display: flex; align-items: center; gap: 4px; padding: 10px 14px; background: var(--lp2); border: 1px solid var(--lb); border-left: 2px solid var(--lr); border-radius: 10px 10px 10px 2px; width: fit-content; animation: bIn .2s ease both; }
        .td { width: 5px; height: 5px; border-radius: 50%; background: var(--lr); opacity: .4; animation: tdot 1.2s ease-in-out infinite; }
        .td:nth-child(2){animation-delay:.2s} .td:nth-child(3){animation-delay:.4s}
        @keyframes tdot { 0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1} }
        .student-compose { display: flex; align-items: flex-end; gap: 8px; max-width: 88%; animation: bIn .2s ease both; }
        .student-compose .bubble { max-width: 100%; }
        .student-send { width: 28px; height: 28px; border-radius: 8px; background: var(--li); color: var(--lp); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 10px 18px rgba(15,14,13,.12); transition: transform .22s ease, background .22s ease; }
        .student-send.is-sending { background: var(--lr); transform: translateX(2px) scale(.96); }
        .student-send svg { display: block; }
        .compose-caret { display: inline-block; width: 1px; height: 1.15em; background: currentColor; margin-left: 2px; vertical-align: text-bottom; animation: caretBlink 1s steps(1, end) infinite; }
        @keyframes caretBlink { 0%,45%{opacity:1}45.01%,100%{opacity:0} }
        .pc-compose-shell { min-height: 96px; padding: 0 18px 18px; display: flex; align-items: flex-end; }
        .pc-compose { width: 100%; display: flex; align-items: flex-end; gap: 10px; padding: 12px; background: linear-gradient(180deg, rgba(245,240,232,.76) 0%, rgba(255,255,255,.94) 100%); border: 1px solid rgba(15,14,13,.08); border-radius: 12px; box-shadow: 0 14px 28px rgba(15,14,13,.08); opacity: 0; transform: translateY(14px); pointer-events: none; transition: opacity .45s ease, transform .45s ease, box-shadow .28s ease; }
        .pc-compose.is-ready { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .pc-compose:focus-within { box-shadow: 0 18px 34px rgba(184,76,43,.16); border-color: rgba(184,76,43,.26); }
        .pc-compose-field { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .pc-compose-label { font-family: var(--ls); font-size: 10px; font-weight: 550; letter-spacing: .12em; text-transform: uppercase; color: var(--li5); }
        .pc-compose-input { width: 100%; resize: none; border: none; outline: none; background: transparent; font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.6; color: var(--li); min-height: 24px; max-height: 112px; }
        .pc-compose-input::placeholder { color: rgba(15,14,13,.42); }
        .pc-compose-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 72px; padding: 10px 14px; border: none; border-radius: 10px; background: var(--li); color: var(--lp); font-family: var(--ls); font-size: 12px; font-weight: 500; cursor: pointer; transition: transform .2s ease, background .2s ease, opacity .2s ease; }
        .pc-compose-btn:hover:not(:disabled) { transform: translateY(-1px); background: #201e1a; }
        .pc-compose-btn:disabled { cursor: default; opacity: .45; }
        .pc-compose-btn.is-busy { background: var(--lr); }

        /* ── FEATURE SHOWCASE SECTIONS ── */
        .lfs-sec { padding: 100px 0; border-top: 1px solid var(--lb); position: relative; overflow: hidden; }
        .lfs-sec-cream { background: var(--lp2); }
        .lfs-inner { max-width: 1160px; margin: 0 auto; padding: 0 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 88px; align-items: center; position: relative; z-index: 1; }
        .lfs-inner-curriculum { grid-template-columns: 1fr 1fr; gap: 88px; align-items: center; }
        .lfs-bullets { margin-top: 32px; display: flex; flex-direction: column; gap: 18px; }
        .lfs-bullet { display: flex; align-items: flex-start; gap: 13px; }
        .lfs-b-icon { width: 30px; height: 30px; border-radius: 6px; background: rgba(184,76,43,.09); border: 1px solid rgba(184,76,43,.18); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; margin-top: 1px; }
        .lfs-b-icon svg, .m-task-ico svg { display: block; }
        .lfs-b-name { font-family: var(--ls); font-size: 14px; font-weight: 600; color: var(--li); margin-bottom: 2px; }
        .lfs-b-desc { font-family: var(--ls); font-size: 13px; font-weight: 300; color: var(--li7); line-height: 1.6; }

        /* ── MOCKUP SHARED ── */
        .mock { background: #fff; border: 1px solid var(--lb); border-radius: 12px; overflow: hidden; box-shadow: 0 16px 52px rgba(15,14,13,.12), 0 2px 8px rgba(15,14,13,.05); }
        .mock-head { padding: 11px 16px; background: var(--lp); border-bottom: 1px solid var(--lb); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mock-head-title { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--li5); }
        .mock-badge { display: inline-flex; align-items: center; font-family: var(--ls); font-size: 9px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; }
        .mock-badge-green { background: #dcfce7; color: #166534; }
        .mock-badge-rust { background: rgba(184,76,43,.1); color: var(--lr); }
        .mock-badge-grey { background: var(--lp2); color: var(--li5); }

        .m-analysis.mock { background: linear-gradient(135deg, #fffdf9 0%, #f6f0e8 100%); border-radius: 16px; }
        .m-analysis-shell { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .m-analysis-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .m-analysis-eyebrow { font-family: var(--ls); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--lr); margin-bottom: 6px; }
        .m-analysis-title { font-family: var(--ld); font-size: 24px; font-weight: 600; line-height: 1.15; color: var(--li); margin-bottom: 6px; }
        .m-analysis-subtitle { font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.65; color: var(--li7); max-width: 430px; }
        .m-analysis-updated { flex-shrink: 0; font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--li5); background: rgba(255,255,255,.75); border: 1px solid rgba(15,14,13,.08); border-radius: 999px; padding: 7px 10px; }
        .m-analysis-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .m-analysis-stat { background: rgba(255,255,255,.86); border: 1px solid rgba(15,14,13,.08); border-radius: 12px; padding: 12px 13px; }
        .m-analysis-stat-label { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--li5); margin-bottom: 8px; }
        .m-analysis-stat-value { font-family: var(--ld); font-size: 24px; font-weight: 600; line-height: 1; color: var(--li); }
        .m-analysis-stat-value-good { color: #166534; }
        .m-analysis-stat-value-alert { color: #9a3412; }
        .m-analysis-summary { background: rgba(255,255,255,.9); border: 1px solid rgba(15,14,13,.08); border-radius: 12px; padding: 14px 16px; }
        .m-analysis-summary-label { font-family: var(--ls); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--li5); margin-bottom: 8px; }
        .m-analysis-summary-copy { font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.72; color: var(--li7); }
        .m-analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .m-analysis-card { background: #fff; border: 1px solid rgba(15,14,13,.08); border-radius: 12px; padding: 14px 16px; }
        .m-analysis-card-strengths { border-top: 3px solid #22c55e; }
        .m-analysis-card-weaknesses { border-top: 3px solid #f97316; }
        .m-analysis-card-recommendations { border-top: 3px solid var(--lr); }
        .m-analysis-card-label { display: flex; align-items: center; gap: 8px; font-family: var(--ls); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 12px; }
        .m-analysis-card-strengths .m-analysis-card-label { color: #166534; }
        .m-analysis-card-weaknesses .m-analysis-card-label { color: #9a3412; }
        .m-analysis-card-recommendations .m-analysis-card-label { color: var(--lr); }
        .m-analysis-card-icon { width: 20px; height: 20px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
        .m-analysis-card-strengths .m-analysis-card-icon { background: #dcfce7; }
        .m-analysis-card-weaknesses .m-analysis-card-icon { background: #ffedd5; }
        .m-analysis-card-recommendations .m-analysis-card-icon { background: rgba(184,76,43,.12); }
        .m-analysis-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .m-analysis-list li { position: relative; padding-left: 14px; font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.65; color: var(--li7); }
        .m-analysis-list li::before { content: ''; position: absolute; left: 0; top: .6em; width: 5px; height: 5px; border-radius: 50%; }
        .m-analysis-card-strengths .m-analysis-list li::before { background: #22c55e; }
        .m-analysis-card-weaknesses .m-analysis-list li::before { background: #f97316; }
        .m-analysis-card-recommendations .m-analysis-list li::before { background: var(--lr); }

        /* ── ANALYTICS MOCKUP ── */
        .m-student { padding: 13px 16px; border-bottom: 1px solid var(--lb); }
        .m-student-name { font-family: var(--ls); font-size: 12px; font-weight: 600; color: var(--li); margin-bottom: 9px; }
        .m-skill { margin-bottom: 6px; }
        .m-skill-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .m-skill-label { font-family: var(--ls); font-size: 11px; font-weight: 300; color: var(--li5); }
        .m-skill-pct { font-family: var(--ls); font-size: 11px; font-weight: 600; }
        .m-skill-track { height: 4px; background: var(--lp2); border-radius: 2px; overflow: hidden; }
        .m-skill-fill { height: 100%; border-radius: 2px; }
        .m-footer { padding: 10px 16px; background: var(--lp); border-top: 1px solid var(--lb); display: flex; align-items: center; justify-content: space-between; }

        /* ── CLASSROOM CARD MOCKUP ── */
        .m-cc-grid { display: flex; justify-content: center; align-items: center; width: 100%; min-width: 0; }
        .m-cc { width: 100%; max-width: 100%; background: #fff; border: 1px solid var(--lb); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
        .m-cc-accent { height: 5px; width: 100%; flex-shrink: 0; }
        .m-cc-accent-purple { background: linear-gradient(90deg, #6b21a8, #a855f7); }
        .m-cc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 22px 12px; }
        .m-cc-name { font-family: var(--ld); font-size: 20px; font-weight: 600; color: var(--li); line-height: 1.25; flex: 1; min-width: 0; display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .m-cc-join { display: flex; align-items: center; gap: 8px; padding: 0 22px 14px; }
        .m-cc-join-label { font-family: var(--ls); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #7a7060; }
        .m-cc-code { font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: .14em; font-weight: 700; color: var(--li); background: var(--lp2); border: 1px solid var(--lb); padding: 3px 10px; border-radius: 4px; }
        .m-cc-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--lb); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); margin: 4px 0 0; }
        .m-cc-stat { background: #faf7f2; padding: 12px 16px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .m-cc-stat-val { font-family: var(--ld); font-size: 22px; font-weight: 700; color: var(--li); line-height: 1; }
        .m-cc-stat-label { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #7a7060; }
        .m-cc-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 14px; margin-top: auto; }
        .m-cc-meta { font-family: var(--ls); font-size: 11px; color: #7a7060; }
        .m-cc-btns { display: flex; gap: 8px; }
        .m-cc-btn-ghost { font-family: var(--ls); font-size: 12px; font-weight: 400; padding: 5px 12px; background: transparent; color: #7a7060; border: 1px solid var(--lb); border-radius: 4px; cursor: default; }
        .m-cc-btn-dark { font-family: var(--ls); font-size: 13px; font-weight: 500; padding: 6px 14px; background: var(--li); color: #f5f0e8; border: none; border-radius: 4px; cursor: default; }

        /* ── SESSION MOCKUP ── */
        .m-sess-head { padding: 14px 16px; background: var(--lp2); border-bottom: 1px solid var(--lb); }
        .m-sess-title { font-family: var(--ld); font-size: 14px; font-weight: 600; color: var(--li); margin-bottom: 8px; }
        .m-sess-prog-wrap { display: flex; align-items: center; gap: 8px; }
        .m-sess-prog-bar { flex: 1; height: 4px; background: var(--lb); border-radius: 2px; overflow: hidden; }
        .m-sess-prog-fill { height: 100%; border-radius: 2px; background: var(--lr); }
        .m-sess-prog-label { font-family: var(--ls); font-size: 10px; font-weight: 600; color: var(--lr); flex-shrink: 0; }
        .m-task { padding: 12px 16px; border-bottom: 1px solid var(--lb); display: flex; align-items: flex-start; gap: 10px; }
        .m-task:last-child { border-bottom: none; }
        .m-task-ico { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; margin-top: 1px; }
        .m-task-done { background: #dcfce7; color: #166534; }
        .m-task-active { background: rgba(184,76,43,.1); color: var(--lr); }
        .m-task-pend { background: var(--lp2); color: var(--li3); }
        .m-task-title { font-family: var(--ls); font-size: 13px; font-weight: 500; color: var(--li); }
        .m-task-sub { font-family: var(--ls); font-size: 11px; font-weight: 300; color: var(--li5); margin-top: 2px; }

        /* ── MR. CURATOR SECTION ── */
        .lcurator { background: var(--li); border-top: 1px solid rgba(245,240,232,.06); padding: 100px 0; position: relative; overflow: hidden; }
        .lcurator-inner { max-width: 1160px; margin: 0 auto; padding: 0 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 88px; align-items: center; position: relative; z-index: 1; }
        .lcurator .sec-label { color: var(--lr); }
        .lcurator .sec-h { color: var(--lp); }
        .lcurator .sec-h em { color: var(--lr); }
        .lcurator .sec-p { color: rgba(245,240,232,.55); }
        .lcur-caps { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 8px; }
        .lcur-cap { font-family: var(--ls); font-size: 12px; font-weight: 400; padding: 7px 14px; border-radius: 4px; background: rgba(245,240,232,.06); border: 1px solid rgba(245,240,232,.1); color: rgba(245,240,232,.6); }

        /* ── SECTION BACKDROPS ── */
        .section-backdrop { position: absolute; z-index: 0; pointer-events: none; color: rgba(90,66,45,.29); opacity: 1; }
        .section-backdrop svg { display: block; width: var(--backdrop-size, 320px); height: var(--backdrop-size, 320px); animation: lbdDrift 24s ease-in-out infinite; will-change: transform; }
        .section-backdrop-dark { color: rgba(245,240,232,.27); }
        .section-backdrop-dialogue { color: rgba(184,76,43,.29); }
        .section-backdrop-analysis { color: rgba(90,66,45,.31); }
        .section-backdrop-curriculum { color: rgba(138,107,68,.29); }
        .section-backdrop-journey { color: rgba(168,92,58,.29); }
        .section-backdrop-process { color: rgba(102,81,59,.31); }
        .section-backdrop-dark.section-backdrop-assistant { color: rgba(245,240,232,.31); }
        .section-backdrop-dark.section-backdrop-seal { color: rgba(245,240,232,.33); }
        .section-backdrop-compass { color: rgba(90,66,45,.27); }
        .section-backdrop-scroll { color: rgba(138,107,68,.27); }
        .section-backdrop-quill { color: rgba(110,82,56,.29); }
        .section-backdrop-laurel { color: rgba(90,66,45,.27); }
        .section-backdrop-dark.section-backdrop-compass { color: rgba(245,240,232,.25); }
        .section-backdrop-dark.section-backdrop-scroll { color: rgba(245,240,232,.23); }
        .section-backdrop-dark.section-backdrop-laurel { color: rgba(245,240,232,.23); }
        .section-backdrop-top-right { top: -42px; right: -28px; transform: rotate(7deg); }
        .section-backdrop-top-left { top: -36px; left: -26px; transform: rotate(-8deg); }
        .section-backdrop-bottom-right { right: -34px; bottom: -46px; transform: rotate(6deg); }
        .section-backdrop-bottom-left { left: -32px; bottom: -42px; transform: rotate(-7deg); }
        .section-backdrop-mid-right { top: 50%; right: -30px; transform: translateY(-50%) rotate(7deg); }
        .section-backdrop-mid-left { top: 50%; left: -28px; transform: translateY(-50%) rotate(-7deg); }
        .section-backdrop-hero-right { top: auto; bottom: -70px; right: -90px; left: auto; transform: rotate(14deg); }
        .section-backdrop-hero-left { top: 68px; left: -50px; right: auto; bottom: auto; transform: rotate(-16deg); opacity: 0.8; }
        .section-backdrop-compass svg { animation: lbdSlowSpin 90s linear infinite; }
        .section-backdrop-scroll svg { animation: lbdDrift 30s ease-in-out infinite; animation-delay: -12s; }
        .section-backdrop-quill svg { animation: lbdDrift 28s ease-in-out infinite; animation-delay: -7s; }
        .section-backdrop-laurel svg { animation: lbdDrift 26s ease-in-out infinite; animation-delay: -4s; }
        @keyframes lbdDrift {
          0%,100% { transform: translate(0,0); }
          30% { transform: translate(5px,-9px); }
          65% { transform: translate(-5px,5px); }
        }
        @keyframes lbdSlowSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* ── HERO BACKDROP GRAPHIC ── */
        .lhero-bg-laurel { position: absolute; top: 60px; left: -60px; color: rgba(90,66,45,.12); pointer-events: none; z-index: 0; transform: rotate(-20deg); }
        .lhero-bg-laurel svg { display: block; animation: lbdDrift 32s ease-in-out infinite; }

        /* ── CURATOR CHAT MOCKUP ── */
        .m-cur { background: #1a1815; border: 1px solid rgba(245,240,232,.1); border-radius: 12px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.45); }
        .m-cur-head { padding: 11px 16px; background: var(--lr); display: flex; align-items: center; gap: 10px; }
        .m-cur-avatar { width: 24px; height: 24px; border-radius: 4px; background: rgba(255,255,255,.22); display: flex; align-items: center; justify-content: center; font-family: var(--ld); font-size: 12px; font-style: italic; color: #fff; flex-shrink: 0; }
        .m-cur-name { font-family: var(--ls); font-size: 12px; font-weight: 500; color: #fff; }
        .m-cur-status { font-family: var(--ls); font-size: 10px; color: rgba(255,255,255,.7); margin-left: auto; display: flex; align-items: center; gap: 5px; }
        .m-cur-status-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.8); animation: pdot 2s ease-in-out infinite; }
        .m-cur-msgs { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .m-cur-row-a { display: flex; justify-content: flex-start; }
        .m-cur-row-u { display: flex; justify-content: flex-end; }
        .m-cur-bub-a { background: rgba(245,240,232,.06); border: 1px solid rgba(245,240,232,.09); border-left: 2px solid var(--lr); border-radius: 10px 10px 10px 2px; padding: 10px 13px; font-family: var(--ls); font-size: 13px; font-weight: 300; color: rgba(245,240,232,.78); line-height: 1.65; max-width: 90%; }
        .m-cur-bub-u { background: var(--lr); border-radius: 10px 10px 2px 10px; padding: 10px 13px; font-family: var(--ls); font-size: 13px; font-weight: 300; color: #fff; line-height: 1.65; max-width: 90%; }
        .m-cur-confirm { margin: 2px 0; background: rgba(184,76,43,.14); border: 1px solid rgba(184,76,43,.28); border-radius: 8px; padding: 11px 13px; }
        .m-cur-confirm-label { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--lr); margin-bottom: 6px; }
        .m-cur-confirm-text { font-family: var(--ls); font-size: 12px; font-weight: 300; color: rgba(245,240,232,.7); margin-bottom: 10px; }
        .m-cur-confirm-btns { display: flex; gap: 7px; }
        .m-cur-confirm-yes { font-family: var(--ls); font-size: 11px; font-weight: 500; padding: 5px 14px; background: var(--lr); color: #fff; border: none; border-radius: 3px; cursor: default; }
        .m-cur-confirm-no { font-family: var(--ls); font-size: 11px; font-weight: 400; padding: 5px 14px; background: transparent; color: rgba(245,240,232,.4); border: 1px solid rgba(245,240,232,.12); border-radius: 3px; cursor: default; }
        .m-cur-input { padding: 12px 16px; border-top: 1px solid rgba(245,240,232,.07); background: rgba(245,240,232,.025); display: flex; align-items: center; gap: 8px; }
        .m-cur-input-placeholder { flex: 1; font-family: var(--ls); font-size: 12px; color: rgba(245,240,232,.22); }
        .m-cur-send { font-family: var(--ls); font-size: 10px; font-weight: 500; padding: 6px 14px; background: var(--lr); color: #fff; border: none; border-radius: 3px; cursor: default; opacity: .6; }

        /* ── HOW IT WORKS ── */
        .lhow { background: var(--lp2); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); padding: 96px 0; position: relative; overflow: hidden; }
        .lhow-inner { display: grid; grid-template-columns: minmax(220px, 1fr) 2fr; gap: 80px; align-items: start; position: relative; z-index: 1; }
        .lhow-steps { display: flex; flex-direction: column; }
        .step-row { display: flex; align-items: flex-start; gap: 18px; padding: 18px 0; border-bottom: 1px solid var(--lb); }
        .step-row:first-child { border-top: 1px solid var(--lb); }
        .step-n { font-family: var(--ld); font-size: 13px; font-style: italic; color: var(--lr); min-width: 30px; flex-shrink: 0; padding-top: 2px; }
        .step-title { font-family: var(--ls); font-size: 14px; font-weight: 600; color: var(--li); margin-bottom: 3px; }
        .step-desc { font-family: var(--ls); font-size: 13px; font-weight: 300; line-height: 1.62; color: var(--li5); }

        /* ── CTA ── */
        .lcta { background: var(--li); padding: 108px 24px; text-align: center; position: relative; overflow: hidden; }
        .lcta::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(184,76,43,.1) 0%, transparent 70%); pointer-events: none; }
        .lcta-eyebrow { font-family: var(--ls); font-size: 10px; font-weight: 600; letter-spacing: .26em; text-transform: uppercase; color: var(--lr); margin-bottom: 18px; display: flex; align-items: center; justify-content: center; gap: 14px; position: relative; }
        .lcta-eyebrow::before, .lcta-eyebrow::after { content: ''; width: 28px; height: 1px; background: var(--lr); opacity: .5; }
        .lcta-title { font-family: var(--ld); font-size: clamp(42px, 6.5vw, 80px); font-weight: 600; color: var(--lp); line-height: 1.04; margin-bottom: 16px; position: relative; }
        .lcta-title em { font-style: italic; color: var(--lr); }
        .lcta-sub { font-family: var(--ls); font-size: 15px; font-weight: 300; color: rgba(245,240,232,.55); margin-bottom: 44px; position: relative; }
        .lcta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }

        /* ── FOOTER ── */
        .lfooter { background: var(--li); border-top: 1px solid rgba(245,240,232,.07); padding: 26px 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .lfooter-brand { font-family: var(--ld); font-size: 16px; font-weight: 600; color: rgba(245,240,232,.22); }
        .lfooter-links { display: flex; gap: 24px; }
        .lfooter-link { font-family: var(--ls); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: rgba(245,240,232,.22); background: none; border: none; cursor: pointer; transition: color .2s; padding: 0; }
        .lfooter-link:hover { color: var(--lr); }
        .lfooter-copy { font-family: var(--ls); font-size: 11px; color: rgba(245,240,232,.16); }

        /* ── REVEAL ── */
        .rev { opacity: 0; transform: translateY(22px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .rev.vis { opacity: 1; transform: translateY(0); }
        .rev-d1{transition-delay:.1s} .rev-d2{transition-delay:.2s} .rev-d3{transition-delay:.3s} .rev-d4{transition-delay:.4s}

        /* ── CTA AMBIENT PULSE ── */
        .lcta::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 40% 60% at 15% 50%, rgba(184,76,43,.07) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 85% 50%, rgba(118,92,66,.06) 0%, transparent 60%); pointer-events: none; animation: ctaOrbs 8s ease-in-out infinite alternate; }
        @keyframes ctaOrbs { 0% { opacity: 0.6; transform: scale(1); } 100% { opacity: 1; transform: scale(1.06); } }
        /* ── STEP ROW HOVER ── */
        .step-row { transition: background .18s; border-radius: 4px; padding-left: 6px; padding-right: 6px; }
        .step-row:hover { background: rgba(184,76,43,.04); }
        /* ── FEATURE BULLET HOVER ── */
        .lfs-bullet { transition: transform .2s cubic-bezier(.16,1,.3,1); }
        .lfs-bullet:hover { transform: translateX(3px); }
        /* ── CAPABILITY TAGS SHIMMER ── */
        @keyframes capShimmer { 0%,100% { background: rgba(245,240,232,.06); } 50% { background: rgba(245,240,232,.11); } }
        .lcur-cap:nth-child(odd) { animation: capShimmer 4s ease-in-out infinite; }
        .lcur-cap:nth-child(even) { animation: capShimmer 4s ease-in-out infinite; animation-delay: -2s; }

        /* ── HERO CLOCKS & GEARS ── */
        .lhero-clock, .lhero-gear { position: absolute; pointer-events: none; z-index: 0; }
        .lhero-clock-a { top: 5%; right: 4%; transform: rotate(14deg); color: rgba(90,66,45,.12); }
        .lhero-clock-b { bottom: 10%; left: 1%; transform: rotate(-22deg); color: rgba(90,66,45,.1); }
        .lhero-clock-c { top: 20%; right: 25%; transform: rotate(-7deg); color: rgba(90,66,45,.072); }
        .lhero-clock-d { bottom: 28%; right: 16%; transform: rotate(10deg); color: rgba(90,66,45,.065); }
        .lhero-gear-a { bottom: 4%; right: 24%; color: rgba(90,66,45,.112); }
        .lhero-gear-a svg { animation: heroGearSpin 22s linear infinite; transform-origin: center; will-change: transform; }
        .lhero-gear-b { top: 8%; left: 26%; color: rgba(90,66,45,.098); }
        .lhero-gear-b svg { animation: heroGearSpin 18s linear infinite reverse; transform-origin: center; will-change: transform; }
        .lhero-gear-c { top: 3%; right: 15%; color: rgba(90,66,45,.078); }
        .lhero-gear-c svg { animation: heroGearSpin 13s linear infinite; transform-origin: center; will-change: transform; }
        .lhero-gear-d { bottom: 18%; left: 18%; color: rgba(90,66,45,.092); }
        .lhero-gear-d svg { animation: heroGearSpin 28s linear infinite reverse; transform-origin: center; will-change: transform; }
        @keyframes heroGearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── RESPONSIVE ── */
        @media (max-width: 1000px) {
          .ln-nav { display: none; }
          .lfs-inner { grid-template-columns: 1fr; gap: 48px; }
          .lfs-inner-curriculum { grid-template-columns: 1fr; }
          .lcurator-inner { grid-template-columns: 1fr; gap: 48px; }
          .lhow-inner { grid-template-columns: 1fr; gap: 40px; }
          .m-analysis-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 1180px) {
          .lfs-inner-curriculum { grid-template-columns: 1fr; gap: 48px; }
        }
        @media (max-width: 760px) {
          .m-cc { max-width: 100%; }
          .section-backdrop svg { width: min(58vw, var(--backdrop-size, 320px)); height: min(58vw, var(--backdrop-size, 320px)); }
        }
        @media (max-width: 600px) {
          .lh-btns { flex-direction: column; align-items: center; }
          .lcta-btns { flex-direction: column; align-items: center; }
          .lfooter { flex-direction: column; text-align: center; }
          .lfooter-links { justify-content: center; }
          .sec-wrap { padding: 0 20px; }
          .m-analysis-header { flex-direction: column; }
          .m-analysis-stats { grid-template-columns: 1fr; }
          .m-analysis-updated { align-self: flex-start; }
          .m-unit-card-footer { flex-direction: column; align-items: stretch; }
          .m-unit-card-actions { width: 100%; }
          .m-unit-card-btn-primary { width: 100%; text-align: center; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="ln">
        <div className="ln-brand">Epoch<span className="ln-brand-dot"></span></div>
        <div className="ln-nav">
          <button className="ln-nav-btn" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Demo</button>
          <button className="ln-nav-btn" onClick={() => document.getElementById('teachers')?.scrollIntoView({ behavior: 'smooth' })}>For Teachers</button>
          <button className="ln-nav-btn" onClick={() => document.getElementById('students')?.scrollIntoView({ behavior: 'smooth' })}>For Students</button>
          <button className="ln-nav-btn" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
        </div>
        <div className="ln-right">
          <button className="ln-si" onClick={() => navigate('/login')}>Sign In</button>
          <button className="ln-cta" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>
      <main>

      {/* ── HERO ── */}
      <section className="lhero">
        <div className="lhero-bg-laurel" aria-hidden="true">
          <svg width="320" height="320" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
            {renderBackdropGraphic('laurel', 320)}
          </svg>
        </div>

        {/* ── Clocks ── */}
        <div className="lhero-clock lhero-clock-a" aria-hidden="true"><HeroClock size={260} offsetMinutes={0} /></div>
        <div className="lhero-clock lhero-clock-b" aria-hidden="true"><HeroClock size={195} offsetMinutes={-330} /></div>
        <div className="lhero-clock lhero-clock-c" aria-hidden="true"><HeroClock size={150} offsetMinutes={60} /></div>
        <div className="lhero-clock lhero-clock-d" aria-hidden="true"><HeroClock size={130} offsetMinutes={-480} /></div>

        {/* ── Gears ── */}
        <div className="lhero-gear lhero-gear-a" aria-hidden="true"><HeroGear size={185} teeth={16} /></div>
        <div className="lhero-gear lhero-gear-b" aria-hidden="true"><HeroGear size={135} teeth={12} /></div>
        <div className="lhero-gear lhero-gear-c" aria-hidden="true"><HeroGear size={92} teeth={10} /></div>
        <div className="lhero-gear lhero-gear-d" aria-hidden="true"><HeroGear size={115} teeth={14} /></div>


        <h1 className={`lh-headline${hl ? ' in' : ''}`}>
          Bring the past
          <span className="lh-headline-em">to life.</span>
        </h1>
        <div className={`lh-sep${hl ? ' in' : ''}`}><span className="lh-sep-diamond" /></div>
        <p className={`lh-desc${hl ? ' in' : ''}`}>
        Epoch is an AI education platform where students don't just read about history — they converse with it, question it, and understand it at a level textbooks never reach.

        </p>
        <div className={`lh-btns${hl ? ' in' : ''}`}>
          <button className="btn-rust" onClick={() => navigate('/register')}>Start Teaching</button>
          <button className="btn-ghost" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>See It in Action</button>
        </div>

      </section>

      {/* ── PERSONA DEMO ── */}
      <section className="ldemo" id="demo" ref={personaRef}>
        <SectionBackdrop className="section-backdrop-top-right" size={300} variant="dialogue" />
        <SectionBackdrop className="section-backdrop-bottom-left" size={210} variant="scroll" />
        <div className="ldemo-inner">
          <div className="ldemo-header rev">
            <div className="sec-label">Live Demo</div>
            <h2 className="sec-h">A conversation with<br /><em>history itself.</em></h2>
            <p className="sec-p">This is what your students experience. Real questions, genuine historical perspective — powered by AI grounded in primary sources.</p>
          </div>
          <div className="pc rev rev-d1">
            <div className="pc-top">
              <span className="pc-top-label">Live Persona · Revolutionary War, 1776</span>
              <span className="pc-live"><span className="pc-live-dot" />Active</span>
            </div>
            <div className="pc-identity">
              <div className="pc-avatar">{persona.initial}</div>
              <div>
                <div className="pc-pname">{persona.name}</div>
                <div className="pc-pera">{persona.era}</div>
              </div>
            </div>
            <div className="pc-body" ref={messagesContainerRef}>
              {visibleMessages.map((msg, i) => (
                <div key={i} className={msg.from === 'student' ? 'mr-s' : 'mr-p'}>
                  {msg.from === 'persona'
                    ? <div className="bubble bubble-p" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                    : <div className="bubble bubble-s">{msg.text}</div>}
                </div>
              ))}
              {studentComposing && (
                <div className="mr-s">
                  <div className="student-compose">
                    <div className="bubble bubble-s">
                      {studentDraft}
                      {!studentSending && <span className="compose-caret" />}
                    </div>
                    <div className={`student-send${studentSending ? ' is-sending' : ''}`}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 8h10" />
                        <path d="M9 4l4 4-4 4" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              {showTyping && (
                <div className="typing-row">
                  <div className="typing-ind"><div className="td" /><div className="td" /><div className="td" /></div>
                </div>
              )}
            </div>
            <div className="pc-compose-shell">
              <form className={`pc-compose${demoReady ? ' is-ready' : ''}`} onSubmit={handleDemoSubmit}>
                <div className="pc-compose-field">
                  <label className="pc-compose-label" htmlFor="landing-persona-input">Ask George Washington</label>
                  <textarea
                    id="landing-persona-input"
                    className="pc-compose-input"
                    rows={1}
                    value={demoInput}
                    onChange={(event) => setDemoInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleDemoSubmit(event);
                      }
                    }}
                    placeholder="Ask about morale, strategy, supplies, independence, etc…"
                    disabled={!demoReady || showTyping || studentComposing || demoReplying}
                  />
                </div>
                <button
                  type="submit"
                  className={`pc-compose-btn${demoReplying ? ' is-busy' : ''}`}
                  disabled={!demoReady || !demoInput.trim() || showTyping || studentComposing || demoReplying}
                >
                  {demoReplying ? 'Replying…' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURE SHOWCASE
      ════════════════════════════════════════ */}
      <div id="features">

        {/* ── SECTION 1: Designed for Teachers ── */}
        <section className="lfs-sec" id="teachers">
          <SectionBackdrop className="section-backdrop-top-left" size={320} variant="analysis" />
          <SectionBackdrop className="section-backdrop-bottom-right" size={240} variant="quill" />
          <div className="lfs-inner sec-wrap">

            {/* Text */}
            <div className="rev">
              <div className="sec-label">For Teachers</div>
              <h2 className="sec-h">Know every student,<br /><em>inside and out.</em></h2>
              <p className="sec-p">Epoch generates a personalized breakdown of what each student excels at and where they need more practice. Aggregate insights across your whole class so you can target instruction where it counts.</p>
              <div className="lfs-bullets">
                <div className="lfs-bullet rev rev-d1">
                  <div className="lfs-b-icon"><ChartColumnIncreasing {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Strengths &amp; Weaknesses Analysis</div>
                    <div className="lfs-b-desc">Granular skill scores per student — critical thinking, source analysis, chronological reasoning, and more.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d2">
                  <div className="lfs-b-icon"><Users {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Class-wide Aggregation</div>
                    <div className="lfs-b-desc">See patterns across your entire room at a glance. Spot the skills every student is missing before the next lesson.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d3">
                  <div className="lfs-b-icon"><MessageSquareText {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Engagement Tracking</div>
                    <div className="lfs-b-desc">Know who's having real conversations and who needs a nudge — without chasing them down.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Analysis Mockup */}
            <div className="mock m-analysis rev rev-d2">
              <div className="mock-head">
                <span className="mock-head-title">Class Performance - Roman Republic Unit</span>
                <span className="mock-badge mock-badge-rust">Teacher View</span>
              </div>
              <div className="m-analysis-shell">
                <div className="m-analysis-header">
                  <div>
                    <div className="m-analysis-eyebrow">AI-Powered</div>
                    <div className="m-analysis-title">Class Strengths &amp; Weaknesses</div>
                    <div className="m-analysis-subtitle">
                      Analyzes every student's quiz and assignment scores to surface class-wide patterns.
                    </div>
                  </div>
                  <div className="m-analysis-updated">Updated 2h ago</div>
                </div>

                <div className="m-analysis-stats">
                  {teacherAnalysisMockup.stats.map(stat => (
                    <div className="m-analysis-stat" key={stat.label}>
                      <div className="m-analysis-stat-label">{stat.label}</div>
                      <div className={`m-analysis-stat-value${stat.tone !== 'neutral' ? ` m-analysis-stat-value-${stat.tone}` : ''}`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="m-analysis-summary">
                  <div className="m-analysis-summary-label">Summary</div>
                  <div className="m-analysis-summary-copy">{teacherAnalysisMockup.summary}</div>
                </div>

                <div className="m-analysis-grid">
                  <div className="m-analysis-card m-analysis-card-strengths">
                    <div className="m-analysis-card-label">
                      <span className="m-analysis-card-icon">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 8 6 12 14 4" />
                        </svg>
                      </span>
                      Strengths
                    </div>
                    <ul className="m-analysis-list">
                      {teacherAnalysisMockup.strengths.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </div>

                  <div className="m-analysis-card m-analysis-card-weaknesses">
                    <div className="m-analysis-card-label">
                      <span className="m-analysis-card-icon">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="8" r="6" />
                          <path d="M8 5v3M8 11h.01" />
                        </svg>
                      </span>
                      Areas to Improve
                    </div>
                    <ul className="m-analysis-list">
                      {teacherAnalysisMockup.weaknesses.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="m-analysis-card m-analysis-card-recommendations">
                  <div className="m-analysis-card-label">
                    <span className="m-analysis-card-icon">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2L10 6l4 .6-3 2.9.7 4L8 11.5 4.3 13.5l.7-4L2 6.6 6 6z" />
                      </svg>
                    </span>
                    Recommendations
                  </div>
                  <ul className="m-analysis-list">
                    {teacherAnalysisMockup.recommendations.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {showLegacyClassInsights ? (
              <div className="mock rev rev-d2">
              <div className="mock-head">
                <span className="mock-head-title">Class Insights · Roman Republic Unit</span>
                <span className="mock-badge mock-badge-grey">24 students</span>
              </div>
              {[
                { name: 'Emily Chen', skills: [{ l: 'Critical Thinking', p: 84, good: true }, { l: 'Source Analysis', p: 52, good: false }, { l: 'Historical Context', p: 91, good: true }] },
                { name: 'Marcus Webb', skills: [{ l: 'Critical Thinking', p: 46, good: false }, { l: 'Source Analysis', p: 78, good: true }, { l: 'Historical Context', p: 31, good: false }] },
              ].map((student, si) => (
                <div className="m-student" key={si}>
                  <div className="m-student-name">{student.name}</div>
                  {student.skills.map((sk, ki) => (
                    <div className="m-skill" key={ki}>
                      <div className="m-skill-row">
                        <span className="m-skill-label">{sk.l}</span>
                        <span className="m-skill-pct" style={{ color: sk.good ? '#166534' : '#b84c2b' }}>{sk.p}%</span>
                      </div>
                      <div className="m-skill-track">
                        <div className="m-skill-fill" style={{ width: `${sk.p}%`, background: sk.good ? '#4ead72' : '#b84c2b' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="m-footer">
                <span style={{ fontFamily: 'var(--ls)', fontSize: 10, color: 'var(--li5)' }}>Class average</span>
                <span style={{ fontFamily: 'var(--ls)', fontSize: 10, fontWeight: 600, color: '#166534' }}>63% · ↑ +12% this week</span>
              </div>
              </div>
            ) : null}

          </div>
        </section>

        {/* ── SECTION 2: Built Around Your Curriculum ── */}
        <section className="lfs-sec lfs-sec-cream">
          <SectionBackdrop className="section-backdrop-bottom-right" size={320} variant="curriculum" />
          <SectionBackdrop className="section-backdrop-top-left" size={220} variant="laurel" />
          <div className="lfs-inner lfs-inner-curriculum sec-wrap">

            {/* Classroom Card Mockup — exact structure from TeacherDashboard */}
            <div className="m-cc-grid rev">
              <div className="m-cc rev rev-d1">
                <div className="m-cc-accent m-cc-accent-purple" />
              <div className="m-cc-top">
                <div className="m-cc-name">US History</div>
              </div>
              <div className="m-cc-join">
                <span className="m-cc-join-label">Join code</span>
                <span className="m-cc-code">TWJJ4Y</span>
              </div>
              <div className="m-cc-stats">
                <div className="m-cc-stat">
                  <strong className="m-cc-stat-val">28</strong>
                  <span className="m-cc-stat-label">Students</span>
                </div>
                <div className="m-cc-stat">
                  <strong className="m-cc-stat-val">8</strong>
                  <span className="m-cc-stat-label">Units</span>
                </div>
                <div className="m-cc-stat">
                  <strong className="m-cc-stat-val">7</strong>
                  <span className="m-cc-stat-label">Published</span>
                </div>
              </div>
              <div className="m-cc-footer">
                <span className="m-cc-meta">Created Mar 26, 2026</span>
                <div className="m-cc-btns">
                  <div className="m-cc-btn-ghost">Delete</div>
                  <div className="m-cc-btn-dark">Open →</div>
                </div>
              </div>
            </div>
            </div>

            {/* Text */}
            <div className="rev rev-d1">
              <div className="sec-label">For Your Content</div>
              <h2 className="sec-h">Your subject,<br /><em>your way.</em></h2>
              <p className="sec-p">Build units around any era, any topic, any learning objective. Assign historical personas, add primary source readings, and configure quizzes — all from a single clean interface.</p>
              <div className="lfs-bullets">
                <div className="lfs-bullet rev rev-d2">
                  <div className="lfs-b-icon"><Landmark {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Unit Builder</div>
                    <div className="lfs-b-desc">Set your topic, define objectives, and go live in minutes. Full control over visibility and scheduling.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d3">
                  <div className="lfs-b-icon"><Drama {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Persona Assignment</div>
                    <div className="lfs-b-desc">Choose from historical figures spanning ancient civilisations to the modern era. Assign multiple per unit.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d4">
                  <div className="lfs-b-icon"><NotebookPen {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Readings &amp; Quizzes</div>
                    <div className="lfs-b-desc">Keep everything in one place — no third-party tools, no link-sharing, no confusion.</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 3: Students Learn by Doing ── */}
        <section className="lfs-sec" id="students">
          <SectionBackdrop className="section-backdrop-mid-left" size={300} variant="journey" />
          <SectionBackdrop className="section-backdrop-top-right" size={230} variant="compass" />
          <div className="lfs-inner sec-wrap">

            {/* Text */}
            <div className="rev">
              <div className="sec-label">For Students</div>
              <h2 className="sec-h">Not a reader.<br /><em>A participant.</em></h2>
              <p className="sec-p">Students don't just read about Julius Caesar — they ask him why he crossed the Rubicon. Every conversation is tracked, every question matters, and every student gets a personalised experience.</p>
              <div className="lfs-bullets">
                <div className="lfs-bullet rev rev-d1">
                  <div className="lfs-b-icon"><Swords {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">AI Conversations</div>
                    <div className="lfs-b-desc">Authentic dialogue grounded in historical reality and primary sources — no hallucinations, no anachronisms.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d2">
                  <div className="lfs-b-icon"><PencilLine {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Personal Notes</div>
                    <div className="lfs-b-desc">Students capture their own thinking as they explore. Notes stay tied to each unit and session.</div>
                  </div>
                </div>
                <div className="lfs-bullet rev rev-d3">
                  <div className="lfs-b-icon"><CircleCheckBig {...featureIconProps} /></div>
                  <div>
                    <div className="lfs-b-name">Progress Tracking</div>
                    <div className="lfs-b-desc">A clear view of what's done and what's next. Students always know where they stand.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Session Mockup */}
            <div className="mock rev rev-d2">
              <div className="m-sess-head">
                <div className="m-sess-title">The Fall of the Roman Republic</div>
                <div className="m-sess-prog-wrap">
                  <div className="m-sess-prog-bar"><div className="m-sess-prog-fill" style={{ width: '72%' }} /></div>
                  <span className="m-sess-prog-label">72%</span>
                </div>
              </div>
              {sessionTasks.map((task, i) => {
                const TaskIcon = task.Icon;

                return (
                  <div className="m-task" key={i}>
                    <div className={`m-task-ico ${task.cls}`}><TaskIcon {...taskIconProps} /></div>
                    <div>
                      <div className="m-task-title">{task.title}</div>
                      <div className="m-task-sub">{task.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ── SECTION 4: Mr. Curator ── */}
        <section className="lcurator">
          <SectionBackdrop className="section-backdrop-dark section-backdrop-bottom-left" size={340} variant="assistant" />
          <SectionBackdrop className="section-backdrop-dark section-backdrop-top-right" size={230} variant="scroll" />
          <div className="lcurator-inner sec-wrap">

            {/* Text */}
            <div className="rev">
              <div className="sec-label">Built-in AI Assistant</div>
              <h2 className="sec-h">Meet<br /><em>Mr. Curator.</em></h2>
              <p className="sec-p">Your personal teaching AI agent, built into Epoch. Ask him to build a unit, add personas, manage your classroom, or answer any history question — all through the app.</p>
              <div className="lcur-caps rev rev-d1">
                {['Create units', 'Add personas', 'Manage classrooms', 'History Q&A', 'Lesson planning', 'Set visibility', 'Bulk operations', 'Curriculum advice'].map((cap, i) => (
                  <span className="lcur-cap" key={i}>{cap}</span>
                ))}
              </div>
            </div>

            {/* Mr. Curator Chat Mockup */}
            <div className="m-cur rev rev-d2">
              <div className="m-cur-head">
                <div className="m-cur-avatar">C</div>
                <span className="m-cur-name">Mr. Curator</span>
                <span className="m-cur-status"><span className="m-cur-status-dot" />Online</span>
              </div>
              <div className="m-cur-msgs">
                <div className="m-cur-row-a">
                  <div className="m-cur-bub-a">I'm Mr. Curator — your Epoch assistant. I can build units, manage personas, and handle your classroom through conversation. What do you need?</div>
                </div>
                <div className="m-cur-row-u">
                  <div className="m-cur-bub-u">Create a unit on the French Revolution for my Year 10 class.</div>
                </div>
                <div className="m-cur-row-a">
                  <div className="m-cur-bub-a">I'll create "The French Revolution: Liberty and Terror" with Robespierre, Marie Antoinette, and Napoleon as personas. Confirm?</div>
                </div>
                <div className="m-cur-confirm">
                  <div className="m-cur-confirm-label">Pending Action</div>
                  <div className="m-cur-confirm-text">Create unit "The French Revolution: Liberty and Terror" with 3 personas in Year 10 History.</div>
                  <div className="m-cur-confirm-btns">
                    <div className="m-cur-confirm-yes">Confirm</div>
                    <div className="m-cur-confirm-no">Cancel</div>
                  </div>
                </div>
              </div>
              <div className="m-cur-input">
                <span className="m-cur-input-placeholder">Ask Mr. Curator anything…</span>
                <div className="m-cur-send">Send</div>
              </div>
            </div>

          </div>
        </section>

      </div>{/* end #features */}

      {/* ── HOW IT WORKS ── */}
      <section className="lhow" id="how">
        <SectionBackdrop className="section-backdrop-top-right" size={310} variant="process" />
        <SectionBackdrop className="section-backdrop-bottom-left" size={250} variant="laurel" />
        <div className="sec-wrap">
          <div className="lhow-inner">
            <div className="rev">
              <div className="sec-label">Process</div>
              <h2 className="sec-h">How<br /><em>it works.</em></h2>
              <p className="sec-p">Four steps from signup to a live classroom where your students are debating Caesar.</p>
            </div>
            <div className="lhow-steps">
              {steps.map((s, i) => (
                <div className={`step-row rev rev-d${i + 1}`} key={i}>
                  <span className="step-n">{s.n}</span>
                  <div>
                    <div className="step-title">{s.t}</div>
                    <div className="step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lcta">
        <SectionBackdrop className="section-backdrop-dark section-backdrop-mid-right" size={320} variant="seal" />
        <SectionBackdrop className="section-backdrop-dark section-backdrop-mid-left" size={270} variant="compass" />
        <div className="lcta-eyebrow rev">Join Epoch Today</div>
        <h2 className="lcta-title rev">Ready to teach<br /><em>differently?</em></h2>
        <br />
        <div className="lcta-btns rev rev-d2">
          <button className="btn-parchment" onClick={() => navigate('/register')}>Create Your Classroom</button>
          <button className="btn-ghost-dk" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      </main>
      <footer className="lfooter">
        <div className="lfooter-brand">Epoch</div>
        <div className="lfooter-links">
          <button className="lfooter-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button className="lfooter-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
          <button className="lfooter-link" onClick={() => navigate('/login')}>Sign In</button>
        </div>
        <div className="lfooter-copy">© {new Date().getFullYear()} Epoch. Built for educators.</div>
      </footer>
    </div>
  );
}
