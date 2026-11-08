import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seed } from '../src/model';
import { callSchedule, defaultCallSchedule, demoCalls, latestCondition, saveCallSchedule } from '../src/monitoring';
import { careNotifications, markNotificationsRead, isNotificationRead, unreadNotificationCount } from '../src/notifications';

test('Legacy state gets schedule defaults without mutation; manager changes survive storage', () => {
  const s=seed(); s.role='anna'; const original=JSON.stringify(s);
  assert.deepEqual(callSchedule(s),defaultCallSchedule); assert.equal(JSON.stringify(s),original);
  const schedule={...callSchedule(s),mode:'times' as const,times:['20:00','09:00']};
  assert.ok(saveCallSchedule(s,schedule));
  assert.deepEqual(callSchedule(JSON.parse(JSON.stringify(s))).times,['09:00','20:00']);
  assert.equal(callSchedule(s).mode,'times');
  assert.ok(saveCallSchedule(s,{...callSchedule(s),mode:'interval',intervalHours:4}));
  assert.equal(callSchedule(s).intervalHours,4);
});
test('Schedule validation and role checks leave state intact on rejection', () => {
  const s=seed(); s.role='anna'; const before=JSON.stringify(s);
  for(const patch of [{intervalHours:0},{intervalHours:1.5},{start:'22:00',end:'09:00'},{mode:'times' as const,times:[]},{mode:'times' as const,times:['09:00','09:00']},{mode:'times' as const,times:['25:00']}]) {
    assert.equal(saveCallSchedule(s,{...callSchedule(s),...patch}),false); assert.equal(JSON.stringify(s),before);
  }
  for(const role of ['senior','elena']) {s.role=role;assert.equal(saveCallSchedule(s,callSchedule(s)),false);}
});
test('Prepared calls stay in the past across midnight; missed call preserves last completed summary', () => {
  const s=seed(); s.clock=10;
  const calls=demoCalls(s); const now=`${s.day} 00:10`;
  assert.ok(calls.every(call=>call.at<now));
  assert.equal(calls[0].status,'missed'); assert.equal(calls[0].transcript.length,0);
  assert.equal(latestCondition(s).id,'call-symptoms');
  assert.ok(latestCondition(s).transcript.some(line=>line.text.includes('не измеряла')));
});
test('Call examples link to the correct call, retain read receipts and never affect alert count', () => {
  const s=seed(); s.role='anna';
  const items=careNotifications(s).filter(item=>item.callId);
  assert.equal(items.length,2); const count=unreadNotificationCount(s);
  markNotificationsRead(s,items.map(item=>item.id));
  assert.ok(items.every(item=>isNotificationRead(s,item))); assert.equal(unreadNotificationCount(s),count);
});
