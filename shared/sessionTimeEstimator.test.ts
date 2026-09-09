import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateSessionTime, htmlToSessionText } from './sessionTimeEstimator';

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

test('applies a standalone repeat count to the preceding line as total executions', () => {
  assert.equal(estimateSessionTime('4 x 50m FC\nRepeat 4 times', 60).totalSeconds, 960);
});

test('reports unrecognised numbered lines while ignoring headings', () => {
  const estimate = estimateSessionTime('Warm Up:\n4 x 50m FC\nDo option 3', 60);
  assert.equal(estimate.recognizedLineCount, 1);
  assert.equal(estimate.unrecognizedLineCount, 1);
});

test('converts common rich text blocks into session lines', () => {
  assert.equal(htmlToSessionText('<div>4 x 50m FC</div><div>2 x 100m BK</div>'), '4 x 50m FC\n2 x 100m BK\n');
});