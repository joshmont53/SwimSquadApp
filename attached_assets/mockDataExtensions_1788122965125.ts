import { SessionTemplate, Drill, Competition, SessionFeedback } from '../types';

export const sessionTemplates: SessionTemplate[] = [
  {
    id: '1',
    name: 'Aerobic Endurance Test Set',
    description: 'High-volume endurance set focused on maintaining consistent race pace over 3000m',
    content: `<p><strong>Warm-Up [15 mins]</strong></p><p>400m FC Choice @ Easy Pace</p><p>4 x 100m IM Drill @ +15 secs rest</p><p><br></p><p><strong>Main Set [40 mins]</strong></p><p>30 x 100m FC @ 1:30</p><p>Target: Hold race pace +5 secs</p><p><br></p><p><strong>Cool Down [5 mins]</strong></p><p>200m Easy Choice</p>`,
    creatorId: '2',
    createdDate: new Date(2024, 10, 1),
  },
  {
    id: '2',
    name: 'Sprint Technique Focus',
    description: 'Technical drills and sprint work emphasizing high elbow catch and acceleration',
    content: `<p><strong>Warm-Up [10 mins]</strong></p><p>2 x 200m FC @ Easy</p><p><br></p><p><strong>Technique [20 mins]</strong></p><p>8 x 25m Catch-up drill @ +10 secs</p><p>8 x 25m Fist drill @ +10 secs</p><p>4 x 50m Build to sprint @ +20 secs</p><p><br></p><p><strong>Main Set [25 mins]</strong></p><p>6 x 75m (25 drill + 50 swim) @ 1:30</p><p>Focus: High elbow catch</p><p><br></p><p><strong>Cool Down [5 mins]</strong></p><p>200m Easy Choice</p>`,
    creatorId: '1',
    createdDate: new Date(2024, 9, 15),
  },
  {
    id: '3',
    name: 'IM Speed Development',
    description: 'Individual medley race pace work with stroke-specific targeting',
    content: `<p><strong>Warm-Up [15 mins]</strong></p><p>400m IM @ Easy</p><p>4 x 50m Kick (1 each stroke) @ +15</p><p><br></p><p><strong>Main Set [35 mins]</strong></p><p>4 x (100 FLY, 100 BK, 100 BR, 100 FC) @ 2:00</p><p>Rest 2 mins between rounds</p><p>Target: Race pace -2 secs</p><p><br></p><p><strong>Cool Down [10 mins]</strong></p><p>300m Easy Choice</p>`,
    creatorId: '4',
    createdDate: new Date(2024, 8, 20),
  },
];

export const drills: Drill[] = [
  {
    id: '1',
    name: 'Catch-up Drill',
    strokeType: 'Freestyle',
    description: 'One arm remains extended while the other completes a full stroke. Arms touch before alternating.',
    videoUrl: 'https://www.youtube.com/embed/b7cJoAWEgvE',
    creatorId: '1',
    createdDate: new Date(2024, 9, 1),
  },
  {
    id: '2',
    name: 'Fist Drill',
    strokeType: 'Freestyle',
    description: 'Swim with closed fists to improve forearm catch and feel for the water.',
    videoUrl: 'https://www.youtube.com/embed/qPBavOFiOdU',
    creatorId: '1',
    createdDate: new Date(2024, 9, 1),
  },
  {
    id: '3',
    name: 'Zipper Drill',
    strokeType: 'Freestyle',
    description: 'Thumb drags along the side of the body from hip to armpit during recovery.',
    videoUrl: 'https://www.youtube.com/embed/q6CXCPaH7q0',
    creatorId: '2',
    createdDate: new Date(2024, 9, 5),
  },
  {
    id: '4',
    name: 'Single Arm Backstroke',
    strokeType: 'Backstroke',
    description: 'Swim backstroke with one arm while the other stays at your side. Focus on rotation.',
    videoUrl: 'https://www.youtube.com/embed/DJbHv_MJUXE',
    creatorId: '1',
    createdDate: new Date(2024, 9, 10),
  },
  {
    id: '5',
    name: 'Double Arm Backstroke',
    strokeType: 'Backstroke',
    description: 'Both arms pull simultaneously. Helps with body position and timing.',
    videoUrl: 'https://www.youtube.com/embed/8KZvUIy3pls',
    creatorId: '3',
    createdDate: new Date(2024, 9, 12),
  },
  {
    id: '6',
    name: 'Two Kicks One Pull',
    strokeType: 'Breaststroke',
    description: 'Execute two breaststroke kicks for every one arm pull. Improves timing and leg strength.',
    videoUrl: 'https://www.youtube.com/embed/V1-YQvWqieo',
    creatorId: '2',
    createdDate: new Date(2024, 9, 15),
  },
  {
    id: '7',
    name: 'Breaststroke Arms Freestyle Kick',
    strokeType: 'Breaststroke',
    description: 'Breaststroke arms with continuous freestyle kick. Focus on arm timing.',
    creatorId: '4',
    createdDate: new Date(2024, 9, 18),
  },
  {
    id: '8',
    name: '3-3-3 Drill',
    strokeType: 'Butterfly',
    description: '3 kicks on right side, 3 kicks on left side, 3 full butterfly strokes. Builds rhythm.',
    videoUrl: 'https://www.youtube.com/embed/H_eLl9YpRhg',
    creatorId: '1',
    createdDate: new Date(2024, 10, 1),
  },
  {
    id: '9',
    name: 'Track Start',
    strokeType: 'Starts',
    description: 'One foot forward start position. Explosive drive off the block with streamlined entry.',
    videoUrl: 'https://www.youtube.com/embed/pE2L4EhZ4n8',
    creatorId: '3',
    createdDate: new Date(2024, 10, 5),
  },
  {
    id: '10',
    name: 'Flip Turn Freestyle',
    strokeType: 'Turns',
    description: 'Somersault turn with feet planted on wall. Push off in streamline position.',
    videoUrl: 'https://www.youtube.com/embed/rC3lFPYjnZU',
    creatorId: '2',
    createdDate: new Date(2024, 10, 8),
  },
  {
    id: '11',
    name: 'Open Turn Breaststroke',
    strokeType: 'Turns',
    description: 'Two-hand touch, rotate body, and push off in streamline. Legal touch required.',
    videoUrl: 'https://www.youtube.com/embed/XDEr-kW1bkY',
    creatorId: '1',
    createdDate: new Date(2024, 10, 10),
  },
  {
    id: '12',
    name: 'Freestyle Breathing Technique',
    strokeType: 'Freestyle',
    description: 'Proper head rotation and breathing timing for freestyle stroke.',
    videoUrl: 'https://www.youtube.com/embed/qpczzwoXbyQ',
    creatorId: '2',
    createdDate: new Date(2024, 10, 12),
  },
];

export const competitions: Competition[] = [
  {
    id: '1',
    name: 'County Championships 2025',
    locationId: '2', // Aldershot Garrison
    startDate: new Date(2025, 11, 6), // Saturday, December 6, 2025
    endDate: new Date(2025, 11, 7), // Sunday, December 7, 2025 (2-day event)
    color: '#3b82f6', // Blue
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2025, 11, 6), startTime: '08:00', endTime: '13:00' },
          { date: new Date(2025, 11, 7), startTime: '14:00', endTime: '17:00' },
        ],
      },
      {
        coachId: '2', // Mike Thompson
        timeBlocks: [
          { date: new Date(2025, 11, 6), startTime: '08:00', endTime: '12:00' },
          { date: new Date(2025, 11, 7), startTime: '13:00', endTime: '18:00' },
        ],
      },
      {
        coachId: '3', // Emma Williams
        timeBlocks: [
          { date: new Date(2025, 11, 7), startTime: '13:00', endTime: '18:00' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Regional Qualifiers',
    locationId: '1', // Hart Leisure Centre
    startDate: new Date(2025, 10, 22), // Saturday, November 22, 2025
    endDate: new Date(2025, 10, 22), // Same day (1-day event)
    color: '#8b5cf6', // Purple
    coachAssignments: [
      {
        coachId: '2', // Mike Thompson
        timeBlocks: [
          { date: new Date(2025, 10, 22), startTime: '09:00', endTime: '16:00' },
        ],
      },
      {
        coachId: '4', // David Brown
        timeBlocks: [
          { date: new Date(2025, 10, 22), startTime: '09:00', endTime: '13:00' },
          { date: new Date(2025, 10, 22), startTime: '14:00', endTime: '16:00' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Winter Open Meet',
    locationId: '3', // Fleet Pool
    startDate: new Date(2026, 0, 17), // Saturday, January 17, 2026
    endDate: new Date(2026, 0, 18), // Sunday, January 18, 2026 (2-day event)
    color: '#ec4899', // Pink
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2026, 0, 17), startTime: '10:00', endTime: '15:00' },
        ],
      },
      {
        coachId: '3', // Emma Williams
        timeBlocks: [
          { date: new Date(2026, 0, 17), startTime: '10:00', endTime: '12:00' },
          { date: new Date(2026, 0, 18), startTime: '13:00', endTime: '15:00' },
        ],
      },
    ],
  },
  {
    id: '4',
    name: 'Hart SC Club Championships',
    locationId: '1', // Hart Leisure Centre
    startDate: new Date(2026, 0, 25), // Sunday, January 25, 2026
    endDate: new Date(2026, 0, 25), // Same day (1-day event)
    color: '#f59e0b', // Amber/Orange
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2026, 0, 25), startTime: '08:00', endTime: '12:00' },
          { date: new Date(2026, 0, 25), startTime: '13:00', endTime: '17:00' },
        ],
      },
      {
        coachId: '2', // Mike Thompson
        timeBlocks: [
          { date: new Date(2026, 0, 25), startTime: '08:00', endTime: '17:00' },
        ],
      },
      {
        coachId: '3', // Emma Williams
        timeBlocks: [
          { date: new Date(2026, 0, 25), startTime: '13:00', endTime: '17:00' },
        ],
      },
      {
        coachId: '4', // David Brown
        timeBlocks: [
          { date: new Date(2026, 0, 25), startTime: '08:00', endTime: '12:00' },
        ],
      },
    ],
  },
  {
    id: '5',
    name: 'Autumn League Gala',
    locationId: '2', // Aldershot Garrison
    startDate: new Date(2025, 10, 29), // Saturday, November 29, 2025
    endDate: new Date(2025, 10, 30), // Sunday, November 30, 2025 (2-day event)
    color: '#10b981', // Green
    coachAssignments: [
      {
        coachId: '2', // Mike Thompson
        timeBlocks: [
          { date: new Date(2025, 10, 29), startTime: '09:00', endTime: '14:00' },
        ],
      },
      {
        coachId: '4', // David Brown
        timeBlocks: [
          { date: new Date(2025, 10, 30), startTime: '09:00', endTime: '14:00' },
        ],
      },
    ],
  },
  {
    id: '6',
    name: 'Christmas Sprint Meet',
    locationId: '1', // Hart Leisure Centre
    startDate: new Date(2025, 11, 13), // Saturday, December 13, 2025
    endDate: new Date(2025, 11, 13), // Same day (1-day event)
    color: '#ef4444', // Red
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2025, 11, 13), startTime: '10:00', endTime: '16:00' },
        ],
      },
      {
        coachId: '3', // Emma Williams
        timeBlocks: [
          { date: new Date(2025, 11, 13), startTime: '10:00', endTime: '13:00' },
          { date: new Date(2025, 11, 13), startTime: '14:00', endTime: '16:00' },
        ],
      },
    ],
  },
  {
    id: '7',
    name: 'Hart Club Champs 2026',
    locationId: '1', // Hart Leisure Centre
    startDate: new Date(2026, 8, 20), // Sunday, September 20, 2026
    endDate: new Date(2026, 8, 20),
    color: '#3b82f6', // Blue
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2026, 8, 20), startTime: '08:00', endTime: '17:00' },
        ],
      },
      {
        coachId: '2', // Mike Thompson
        timeBlocks: [
          { date: new Date(2026, 8, 20), startTime: '08:00', endTime: '17:00' },
        ],
      },
    ],
  },
  {
    id: '8',
    name: 'Hart Autumn Meet 2026',
    locationId: '1', // Hart Leisure Centre
    startDate: new Date(2026, 9, 24), // Saturday, October 24, 2026
    endDate: new Date(2026, 9, 25),   // Sunday, October 25, 2026
    color: '#f59e0b', // Amber
    coachAssignments: [
      {
        coachId: '1', // Sarah Johnson
        timeBlocks: [
          { date: new Date(2026, 9, 24), startTime: '08:00', endTime: '16:00' },
          { date: new Date(2026, 9, 25), startTime: '08:00', endTime: '13:00' },
        ],
      },
      {
        coachId: '3', // Emma Williams
        timeBlocks: [
          { date: new Date(2026, 9, 24), startTime: '09:00', endTime: '16:00' },
          { date: new Date(2026, 9, 25), startTime: '09:00', endTime: '13:00' },
        ],
      },
    ],
  },
];

export const sessionFeedback: SessionFeedback[] = [
  // Feedback for Session 18 - Junior Squad on December 4, 2025
  {
    id: '1',
    sessionId: '18', // Junior Squad session from Dec 4
    coachId: '2', // Mike Thompson
    isPrivate: false,
    ratings: {
      engagement: 8,
      effortAndIntent: 7,
      enjoyment: 9,
      focus: 7,
      techniqueQuality: 6,
      sessionStructure: 8,
    },
    notes: 'Great energy from the juniors today! They really enjoyed the skills development work. Some struggled with maintaining technique when fatigued, but overall excellent effort.',
    createdAt: new Date(2024, 11, 4, 19, 0),
    updatedAt: new Date(2024, 11, 4, 19, 0),
  },
  {
    id: '2',
    sessionId: '18', // Same Junior Squad session - second coach feedback
    coachId: '1', // Sarah Johnson also gave feedback
    isPrivate: false,
    ratings: {
      engagement: 7,
      effortAndIntent: 8,
      enjoyment: 8,
      focus: 6,
      techniqueQuality: 7,
      sessionStructure: 7,
    },
    notes: 'Juniors were a bit unfocused at times, but they responded well to corrections. Need to work on maintaining concentration during drill sets.',
    createdAt: new Date(2024, 11, 4, 19, 15),
    updatedAt: new Date(2024, 11, 4, 19, 15),
  },
  // Previous Junior Squad sessions for trend analysis
  {
    id: '3',
    sessionId: '6', // Previous Junior Squad session from Nov 11
    coachId: '2', // Mike Thompson
    isPrivate: false,
    ratings: {
      engagement: 9,
      effortAndIntent: 8,
      enjoyment: 8,
      focus: 8,
      techniqueQuality: 7,
      sessionStructure: 9,
    },
    notes: 'Excellent technique session! Juniors were very focused on body position drills. Really impressed with their attention to detail.',
    createdAt: new Date(2024, 10, 11, 17, 30),
    updatedAt: new Date(2024, 10, 11, 17, 30),
  },
  {
    id: '4',
    sessionId: '12', // Another Junior Squad session from Nov 20
    coachId: '3', // Emma Williams
    isPrivate: false,
    ratings: {
      engagement: 6,
      effortAndIntent: 7,
      enjoyment: 9,
      focus: 5,
      techniqueQuality: 6,
      sessionStructure: 8,
    },
    notes: 'Recovery session - juniors were tired from the week. Kept it light and fun. Focus was low but that was expected for a Friday evening recovery session.',
    createdAt: new Date(2024, 10, 20, 17, 30),
    updatedAt: new Date(2024, 10, 20, 17, 30),
  },
  {
    id: '5',
    sessionId: '6', // Another feedback for Nov 11 session
    coachId: '3', // Emma Williams
    isPrivate: false,
    ratings: {
      engagement: 8,
      effortAndIntent: 9,
      enjoyment: 7,
      focus: 9,
      techniqueQuality: 8,
      sessionStructure: 8,
    },
    notes: 'Strong session overall. The technique drills were challenging but the juniors stayed engaged. Really good effort throughout.',
    createdAt: new Date(2024, 10, 11, 17, 45),
    updatedAt: new Date(2024, 10, 11, 17, 45),
  },
  // Some feedback for other squads to show variety
  {
    id: '6',
    sessionId: '1', // Skills Advanced session
    coachId: '1', // Sarah Johnson
    isPrivate: true,
    ratings: {
      engagement: 7,
      effortAndIntent: 8,
      enjoyment: 6,
      focus: 7,
      techniqueQuality: 7,
      sessionStructure: 7,
    },
    notes: 'Solid session but could use more variety in the main set to keep engagement higher.',
    createdAt: new Date(2024, 11, 4, 20, 0),
    updatedAt: new Date(2024, 11, 4, 20, 0),
  },
];