import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateSessionTime,
  formatEstimatedSwimmingTime,
  htmlToSessionText,
} from './sessionTimeEstimator';

test('formats rounded estimates using hours and minutes only', () => {
  assert.equal(formatEstimatedSwimmingTime(45 * 60), '~45 mins');
  assert.equal(formatEstimatedSwimmingTime(70 * 60), '~1 hour 10 mins');
  assert.equal(formatEstimatedSwimmingTime(7410), '~2 hours 4 mins');
});

test('uses explicit turnaround time per repeat', () => {
  assert.equal(estimateSessionTime('2 x 200m FC @ 4', 60).totalSeconds, 480);
  assert.equal(estimateSessionTime('2 200m FC off 4', 60).totalSeconds, 480);
  assert.equal(estimateSessionTime('2 x 200m FC - 4 mins repeat', 60).totalSeconds, 480);
  assert.equal(estimateSessionTime('1. 4 x 50m FC @ 1:00', 60).totalSeconds, 240);
  assert.equal(estimateSessionTime('4 x 50m FC @ 45', 60).totalSeconds, 180);
});

test('adds rest after every repeat', () => {
  assert.equal(estimateSessionTime('4 x 50m @ + 15', 60).totalSeconds, 300);
  assert.equal(estimateSessionTime('4 x 50m FC 15 rest', 60).totalSeconds, 300);
  assert.equal(estimateSessionTime('50m FC rest 15 repeat 4 times', 60).totalSeconds, 300);
});

test('uses squad pace for distance-only sets', () => {
  assert.equal(estimateSessionTime('4 x 100m FC', 50).totalSeconds, 400);
  assert.equal(estimateSessionTime('2 200m FC', 60).totalSeconds, 480);
});

test('recognizes common distances written without an m', () => {
  assert.equal(estimateSessionTime('400 IM', 60).totalSeconds, 480);
  assert.equal(estimateSessionTime('2 x 200 fc', 60).totalSeconds, 480);
  assert.equal(estimateSessionTime('200fc dps', 60).totalSeconds, 240);
  assert.equal(estimateSessionTime('100kick with effort', 60).totalSeconds, 120);
});

test('does not treat numbered coaching instructions as distances', () => {
  const estimate = estimateSessionTime('1: Fast BO\n1: Fast 25m\n1: Fast 35m\n3 on each stroke IMO', 60);
  assert.equal(estimate.recognizedLineCount, 0);
  assert.equal(estimate.totalSeconds, 0);
});

test('estimates mixed m and unitless notation in a complete session', () => {
  const session = `warm up

200m FC

Main Set

10 x 100m fc

warm down

200m BK
400 IM

4 x 50m fLY @ + 15`;

  assert.equal(estimateSessionTime(session, 60).totalSeconds, 2460);
});

test('applies a standalone repeat count to the preceding line as total executions', () => {
  assert.equal(estimateSessionTime('4 x 50m FC\nRepeat 4 times', 60).totalSeconds, 960);
});

test('reports unrecognised numbered lines while ignoring headings', () => {
  const estimate = estimateSessionTime('Warm Up:\n4 x 50m FC\nDo option 3', 60);
  assert.equal(estimate.recognizedLineCount, 1);
  assert.equal(estimate.unrecognizedLineCount, 1);
});

test('converts common rich text blocks into session lines', () => {
  assert.equal(htmlToSessionText('<div>4 x 50m FC</div><div>2 x 100m BK</div>'), '\n4 x 50m FC\n\n2 x 100m BK\n');
});

test('keeps a new contenteditable block separate while it is being typed', () => {
  const firstLine = '4 x 100 @ 2:45';
  for (const partialSecondLine of ['2', '20']) {
    const text = htmlToSessionText(`${firstLine}<div>${partialSecondLine}</div>`);
    assert.equal(estimateSessionTime(text, 60).totalSeconds, 660);
  }

  const complete = htmlToSessionText(`${firstLine}<div>200 kick</div>`);
  assert.equal(estimateSessionTime(complete, 60).totalSeconds, 900);
});

test('estimates dense coach shorthand consistently with the confirmed manual calculation', () => {
  const session = `Warm Up ALL WITH 15seconds rest

200fc dps, 100IM drill

200fc build,  100IM Tech

200fc @pace, 100IM fast

Mini set kick / swim hvo / pull

6 x 50 kick 1st 25 fast ease down for

2 TR 1.15

4 fast TR 1.00

2x100  TR 2.00 1: no 1 working break out, turn and finish max

2: fc working break out, turn and finish max

4x150 TR 2.30 PULL FC or BC

paddles descend 1-3 snorks for fc

MAIN:

3x200 IM  TR 3.30

100 dps ez choice

4x

      100 TR 2.00

      2x50 TR 1.00

ONE BLOCK ON EACH STROKE IMO

(IM ORDER eg Rd 1 fly Rd 2 Bc etc no extra rest between blocks)

100Ez O/C

3x200 FC TR 3.00 descend

kick @ wall turns SPRINT 25s ease down to 50m in pairs. 8x50 as 4: Bc 4: Fc LIFO

400 FC SNORKS / FINS / PADS DPS FEEL FAST LONG STROKE UNCOMFORTABLE BUT NOT MAX

IF TIME

      12x50 RS TR 1.30

      3 on each stroke IMO

      1: Fast BO

      1: Fast 25m

      1: Fast 35m

Warm down

      100kick with effort

      200pull alt 50s fc / bc

      200 brst-fc 50s dps`;

  assert.equal(estimateSessionTime(session, 60).totalSeconds, 7410);
});