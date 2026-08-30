import { Squad, Location, Coach, Swimmer, Session } from '../types';

export const squads: Squad[] = [
  { id: '1', name: 'Skills Advanced', color: '#3b82f6', primaryCoachId: '1' }, // blue
  { id: '2', name: 'Development', color: '#10b981', primaryCoachId: '2' }, // green
  { id: '3', name: 'Performance', color: '#f59e0b', primaryCoachId: '3' }, // amber
  { id: '4', name: 'Elite', color: '#ef4444', primaryCoachId: '4' }, // red
  { id: '5', name: 'Junior', color: '#8b5cf6', primaryCoachId: '2' }, // violet
  { id: '6', name: 'Skills Foundation', color: '#06b6d4', primaryCoachId: '1' }, // cyan
];

export const locations: Location[] = [
  { id: '1', name: 'Hart Leisure Centre', poolType: '25m' },
  { id: '2', name: 'Aldershot Garrison', poolType: '50m' },
  { id: '3', name: 'Fleet Pool', poolType: '25m' },
];

export const coaches: Coach[] = [
  { 
    id: '1', 
    firstName: 'Sarah', 
    lastName: 'Johnson',
    level: 'Level 2',
    dateOfBirth: new Date(1990, 5, 15),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '2', 
    firstName: 'Mike', 
    lastName: 'Thompson',
    level: 'Level 3',
    dateOfBirth: new Date(1985, 3, 22),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '3', 
    firstName: 'Emma', 
    lastName: 'Williams',
    level: 'Level 1',
    dateOfBirth: new Date(1995, 8, 10),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '4', 
    firstName: 'David', 
    lastName: 'Brown',
    level: 'Level 2',
    dateOfBirth: new Date(1988, 11, 5),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '5', 
    firstName: 'Joshua', 
    lastName: 'Montgomery',
    level: 'Level 3',
    dateOfBirth: new Date(1987, 2, 18),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
];

export const swimmers: Swimmer[] = [
  { 
    id: '1', 
    firstName: 'Joshua', 
    lastName: 'Montgomery', 
    squadId: '1',
    asaNumber: 123456,
    dateOfBirth: new Date(2010, 3, 15),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '2', 
    firstName: 'Beth', 
    lastName: 'Collins', 
    squadId: '1',
    asaNumber: 123457,
    dateOfBirth: new Date(2011, 7, 22),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '3', 
    firstName: 'Charlie', 
    lastName: 'Davis', 
    squadId: '2',
    asaNumber: 123458,
    dateOfBirth: new Date(2009, 1, 10),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '4', 
    firstName: 'Dana', 
    lastName: 'Lee', 
    squadId: '3',
    asaNumber: 123459,
    dateOfBirth: new Date(2008, 11, 5),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '5', 
    firstName: 'Ethan', 
    lastName: 'Moore', 
    squadId: '4',
    asaNumber: 123460,
    dateOfBirth: new Date(2007, 5, 18),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '6', 
    firstName: 'Olivia', 
    lastName: 'Taylor', 
    squadId: '1',
    asaNumber: 123461,
    dateOfBirth: new Date(2010, 8, 12),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '7', 
    firstName: 'Lucas', 
    lastName: 'Anderson', 
    squadId: '1',
    asaNumber: 123462,
    dateOfBirth: new Date(2011, 2, 25),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '8', 
    firstName: 'Emma', 
    lastName: 'Wilson', 
    squadId: '2',
    asaNumber: 123463,
    dateOfBirth: new Date(2009, 6, 30),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '9', 
    firstName: 'Noah', 
    lastName: 'Jackson', 
    squadId: '2',
    asaNumber: 123464,
    dateOfBirth: new Date(2010, 11, 8),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '10', 
    firstName: 'Sophia', 
    lastName: 'Martin', 
    squadId: '3',
    asaNumber: 123465,
    dateOfBirth: new Date(2008, 4, 14),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '11', 
    firstName: 'Liam', 
    lastName: 'Thompson', 
    squadId: '3',
    asaNumber: 123466,
    dateOfBirth: new Date(2009, 9, 21),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '12', 
    firstName: 'Ava', 
    lastName: 'White', 
    squadId: '4',
    asaNumber: 123467,
    dateOfBirth: new Date(2007, 1, 17),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '13', 
    firstName: 'Mason', 
    lastName: 'Harris', 
    squadId: '1',
    asaNumber: 123468,
    dateOfBirth: new Date(2011, 5, 3),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '14', 
    firstName: 'Isabella', 
    lastName: 'Clark', 
    squadId: '2',
    asaNumber: 123469,
    dateOfBirth: new Date(2010, 10, 19),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '15', 
    firstName: 'James', 
    lastName: 'Lewis', 
    squadId: '5',
    asaNumber: 123470,
    dateOfBirth: new Date(2012, 3, 7),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '16', 
    firstName: 'Mia', 
    lastName: 'Walker', 
    squadId: '5',
    asaNumber: 123471,
    dateOfBirth: new Date(2012, 7, 28),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '17', 
    firstName: 'Benjamin', 
    lastName: 'Hall', 
    squadId: '1',
    asaNumber: 123472,
    dateOfBirth: new Date(2010, 1, 11),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '18', 
    firstName: 'Charlotte', 
    lastName: 'Allen', 
    squadId: '3',
    asaNumber: 123473,
    dateOfBirth: new Date(2008, 8, 24),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '19', 
    firstName: 'Oliver', 
    lastName: 'Young', 
    squadId: '1',
    asaNumber: 123474,
    dateOfBirth: new Date(2010, 6, 9),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '20', 
    firstName: 'Amelia', 
    lastName: 'King', 
    squadId: '1',
    asaNumber: 123475,
    dateOfBirth: new Date(2011, 4, 16),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '21', 
    firstName: 'William', 
    lastName: 'Wright', 
    squadId: '1',
    asaNumber: 123476,
    dateOfBirth: new Date(2010, 9, 20),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '22', 
    firstName: 'Emily', 
    lastName: 'Scott', 
    squadId: '1',
    asaNumber: 123477,
    dateOfBirth: new Date(2011, 1, 5),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '23', 
    firstName: 'Jack', 
    lastName: 'Green', 
    squadId: '1',
    asaNumber: 123478,
    dateOfBirth: new Date(2010, 10, 13),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '24', 
    firstName: 'Grace', 
    lastName: 'Adams', 
    squadId: '1',
    asaNumber: 123479,
    dateOfBirth: new Date(2011, 3, 27),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '25', 
    firstName: 'Harry', 
    lastName: 'Baker', 
    squadId: '1',
    asaNumber: 123480,
    dateOfBirth: new Date(2010, 7, 8),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '26', 
    firstName: 'Lily', 
    lastName: 'Nelson', 
    squadId: '1',
    asaNumber: 123481,
    dateOfBirth: new Date(2011, 0, 14),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '27', 
    firstName: 'Thomas', 
    lastName: 'Carter', 
    squadId: '1',
    asaNumber: 123482,
    dateOfBirth: new Date(2010, 5, 22),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '28', 
    firstName: 'Ella', 
    lastName: 'Mitchell', 
    squadId: '1',
    asaNumber: 123483,
    dateOfBirth: new Date(2011, 8, 18),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '29', 
    firstName: 'George', 
    lastName: 'Roberts', 
    squadId: '2',
    asaNumber: 123484,
    dateOfBirth: new Date(2009, 2, 11),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '30', 
    firstName: 'Sophie', 
    lastName: 'Turner', 
    squadId: '2',
    asaNumber: 123485,
    dateOfBirth: new Date(2010, 0, 29),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '31', 
    firstName: 'Daniel', 
    lastName: 'Phillips', 
    squadId: '1',
    asaNumber: 123486,
    dateOfBirth: new Date(2011, 6, 15),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  { 
    id: '32', 
    firstName: 'Chloe', 
    lastName: 'Campbell', 
    squadId: '1',
    asaNumber: 123487,
    dateOfBirth: new Date(2010, 4, 6),
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
];

// Generate sample sessions for the current month
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

export const sessions: Session[] = [
  // Week 1
  {
    id: '1',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    secondCoachId: '2',
    setWriterId: '1',
    date: new Date(currentYear, currentMonth, 4),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Technique',
    content: `<p><strong>Warm-Up [10 mins]</strong></p><p>2 x 50m FC Swim @+10 secs rest</p><p>2 x 25m BK Swim @+10 secs rest</p><p>2 x 25m BR Swim @+10 secs rest</p><p>2 x 25m FLY kick in streamline @+10 secs rest</p><p><br></p><p><strong>Technique Drills [15 mins]</strong></p><p>4 x 25m Catch-up Drill @ +15 secs</p><p>4 x 25m Fist Drill @ +15 secs</p><p>4 x 25m Zipper Drill @ +15 secs</p><p><br></p><p><strong>Arms [10 mins]</strong></p><p>4 x 25m Breaststroke Arms Freestyle Kick (Fins)</p><p>4 x 25m BR Arms + FC Kick (Fins - Crash Head Down) [Race Streamline]</p>`,
    distanceBreakdown: {
      total: 1400,
      frontCrawl: 150,
      frontCrawlBreakdown: { swim: 150, drill: 0, kick: 0, pull: 0 },
      backstroke: 1150,
      backstrokeBreakdown: { swim: 550, drill: 450, kick: 150, pull: 0 },
      breaststroke: 0,
      breaststrokeBreakdown: { swim: 0, drill: 0, kick: 0, pull: 0 },
      butterfly: 50,
      butterflyBreakdown: { swim: 0, drill: 0, kick: 50, pull: 0 },
      individualMedley: 50,
      individualMedleyBreakdown: { swim: 50, drill: 0, kick: 0, pull: 0 },
    },
  },
  {
    id: '2',
    squadId: '2',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(currentYear, currentMonth, 4),
    startTime: '18:00',
    endTime: '19:30',
    focus: 'Aerobic capacity',
    sessionNotes: 'Focus on maintaining stroke technique during longer sets. Charlie showed improvement in his breathing pattern today. Emma needs more work on her turns - remember to address this in next session. Also, pool temperature was a bit cold which may have affected performance in the later sets.',
    content: `<p><strong>Warm-Up [15 mins]</strong></p><p>400m FC Swim @ Easy pace</p><p>4 x 50m IM Order (FC/BK/BR/FLY) @ +15 secs rest</p><p><br></p><p><strong>Main Set - Aerobic Threshold [45 mins]</strong></p><p>8 x 200m FC @ 3:30 [Target: 70-75% effort]</p><p>Focus: Consistent pace, maintain stroke count</p><p>200m Easy FC between each rep</p><p><br></p><p><strong>Stroke Work [20 mins]</strong></p><p>4 x 100m BK @ 2:00</p><p>4 x 100m BR @ 2:15</p><p>Focus: Technique over speed</p><p><br></p><p><strong>Cool Down [10 mins]</strong></p><p>200m Easy Choice</p><p>100m Backstroke kick with board</p>`,
    distanceBreakdown: {
      total: 3500,
      frontCrawl: 2400,
      frontCrawlBreakdown: { swim: 2200, drill: 0, kick: 0, pull: 200 },
      backstroke: 550,
      backstrokeBreakdown: { swim: 400, drill: 0, kick: 150, pull: 0 },
      breaststroke: 450,
      breaststrokeBreakdown: { swim: 400, drill: 0, kick: 50, pull: 0 },
      butterfly: 50,
      butterflyBreakdown: { swim: 50, drill: 0, kick: 0, pull: 0 },
      individualMedley: 50,
      individualMedleyBreakdown: { swim: 50, drill: 0, kick: 0, pull: 0 },
    },
  },
  // Overlapping session at same location to test column layout
  {
    id: '18',
    squadId: '5',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(currentYear, currentMonth, 4),
    startTime: '17:30',
    endTime: '18:30',
    focus: 'Skills development',
  },
  {
    id: '3',
    squadId: '3',
    locationId: '2',
    leadCoachId: '3',
    setWriterId: '3',
    date: new Date(currentYear, currentMonth, 5),
    startTime: '16:00',
    endTime: '17:30',
    focus: 'Speed',
  },
  {
    id: '4',
    squadId: '4',
    locationId: '2',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(currentYear, currentMonth, 5),
    startTime: '16:00',
    endTime: '17:30',
    focus: 'Anaerobic capacity',
  },
  {
    id: '17',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(currentYear, currentMonth, 5),
    startTime: '17:00',
    endTime: '18:00',
    focus: 'Technique',
  },
  // Week 2
  {
    id: '5',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(currentYear, currentMonth, 11),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Starts & turns',
    content: `<p><strong>Warm-Up [10 mins]</strong></p><p>400m Choice @ Easy</p><p><br></p><p><strong>Starts Practice [20 mins]</strong></p><p>8 x Track Start + 15m sprint</p><p>Focus: Explosive power off the block</p><p>Rest 60 secs between reps</p><p><br></p><p><strong>Turns Practice [20 mins]</strong></p><p>8 x Flip Turn Freestyle (25m approach + turn + 15m)</p><p>4 x Open Turn Breaststroke (25m approach + turn + 15m)</p><p>Focus: Tight streamline off the wall</p><p><br></p><p><strong>Cool Down [10 mins]</strong></p><p>200m Easy Choice</p>`,
  },
  {
    id: '6',
    squadId: '5',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(currentYear, currentMonth, 11),
    startTime: '16:00',
    endTime: '17:00',
    focus: 'Technique',
  },
  {
    id: '7',
    squadId: '2',
    locationId: '2',
    leadCoachId: '3',
    setWriterId: '3',
    date: new Date(currentYear, currentMonth, 12),
    startTime: '18:00',
    endTime: '19:30',
    focus: 'Aerobic capacity',
  },
  {
    id: '8',
    squadId: '3',
    locationId: '1',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(currentYear, currentMonth, 13),
    startTime: '17:30',
    endTime: '19:00',
    focus: 'Speed',
  },
  // Week 3
  {
    id: '9',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(currentYear, currentMonth, 18),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Technique',
  },
  {
    id: '10',
    squadId: '4',
    locationId: '2',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(currentYear, currentMonth, 18),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Aerobic capacity',
  },
  {
    id: '11',
    squadId: '2',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(currentYear, currentMonth, 19),
    startTime: '18:30',
    endTime: '20:00',
    focus: 'Technique',
  },
  {
    id: '12',
    squadId: '5',
    locationId: '3',
    leadCoachId: '3',
    setWriterId: '3',
    date: new Date(currentYear, currentMonth, 20),
    startTime: '16:00',
    endTime: '17:00',
    focus: 'Recovery',
  },
  // Week 4
  {
    id: '13',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(currentYear, currentMonth, 25),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Technique',
  },
  {
    id: '14',
    squadId: '3',
    locationId: '2',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(currentYear, currentMonth, 25),
    startTime: '17:00',
    endTime: '18:30',
    focus: 'Recovery',
  },
  {
    id: '15',
    squadId: '4',
    locationId: '2',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(currentYear, currentMonth, 26),
    startTime: '16:30',
    endTime: '18:00',
    focus: 'Anaerobic capacity',
  },
  {
    id: '16',
    squadId: '2',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(currentYear, currentMonth, 27),
    startTime: '18:30',
    endTime: '20:00',
    focus: 'Technique',
  },
  // Sep 2026 test sessions — Skills Advanced
  {
    id: '17',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(2026, 8, 1),
    startTime: '18:00',
    endTime: '20:00',
    focus: 'Aerobic capacity',
  },
  {
    id: '18',
    squadId: '2',
    locationId: '1',
    leadCoachId: '2',
    setWriterId: '2',
    date: new Date(2026, 8, 1),
    startTime: '18:00',
    endTime: '20:00',
    focus: 'Aerobic capacity',
  },
  {
    id: '19',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(2026, 8, 4),
    startTime: '19:00',
    endTime: '21:00',
    focus: 'Speed',
  },
  {
    id: '20',
    squadId: '1',
    locationId: '1',
    leadCoachId: '1',
    setWriterId: '1',
    date: new Date(2026, 8, 5),
    startTime: '08:00',
    endTime: '10:00',
    focus: 'Technique',
  },
  // Sep 2026 test sessions — Performance, Elite, joint
  {
    id: '21',
    squadId: '3',
    locationId: '1',
    leadCoachId: '3',
    setWriterId: '3',
    date: new Date(2026, 8, 3),
    startTime: '18:00',
    endTime: '20:00',
    focus: 'Aerobic capacity',
  },
  {
    id: '22',
    squadId: '4',
    locationId: '1',
    leadCoachId: '4',
    setWriterId: '4',
    date: new Date(2026, 8, 4),
    startTime: '18:00',
    endTime: '20:00',
    focus: 'Speed',
  },
  {
    id: '23',
    squadId: '3',
    additionalSquadIds: ['4'],
    locationId: '1',
    leadCoachId: '3',
    secondCoachId: '4',
    setWriterId: '3',
    date: new Date(2026, 8, 5),
    startTime: '08:00',
    endTime: '10:00',
    focus: 'Technique',
  },
];