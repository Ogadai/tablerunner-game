import { Location } from './types';

export const cauldronOfFire: Location[] = [
  {
    "id": 1,
    "description": "A wide open cave with a high ceiling and a dripping sound. Another tunnel leads East",
    "move": [
      {
        "direction": "e",
        "id": 2
      },
      {
        "direction": "n",
        "id": 40
      }
    ]
  },
  {
    "id": 2,
    "description": "An East to West tunnel with a junction leading North",
    "move": [
      {
        "direction": "n",
        "id": 39
      },
      {
        "direction": "e",
        "id": 3
      },
      {
        "direction": "w",
        "id": 1
      }
    ]
  },
  {
    "id": 3,
    "description": "This large cavern has a pit in the center. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 2
      }
    ]
  },
  {
    "id": 4,
    "description": "There appears to be a camp to the North West, and a path leads back East",
    "move": [
      {
        "direction": "e",
        "id": 5
      },
      {
        "direction": "nw",
        "id": 38
      }
    ]
  },
  {
    "id": 5,
    "description": "On a small road leading East to West",
    "move": [
      {
        "direction": "e",
        "id": 6
      },
      {
        "direction": "w",
        "id": 4
      }
    ]
  },
  {
    "id": 6,
    "description": "The road leads West or North East. A small track enters the trees to the East.",
    "move": [
      {
        "direction": "w",
        "id": 5
      },
      {
        "direction": "e",
        "id": 7
      },
      {
        "direction": "ne",
        "id": 34
      }
    ]
  },
  {
    "id": 7,
    "description": "A hidden glade in the trees. The only way out it West.",
    "move": [
      {
        "direction": "w",
        "id": 6
      }
    ]
  },
  {
    "id": 8,
    "description": "A track leads to the North West, or to the East.",
    "move": [
      {
        "direction": "e",
        "id": 9
      },
      {
        "direction": "nw",
        "id": 34
      }
    ]
  },
  {
    "id": 9,
    "description": "A track that leads from East to West.",
    "move": [
      {
        "direction": "e",
        "id": 10
      },
      {
        "direction": "w",
        "id": 8
      }
    ]
  },
  {
    "id": 10,
    "description": "The road North leads through a wooden gate. There are tracks leading East and West.",
    "move": [
      {
        "direction": "n",
        "id": 31
      },
      {
        "direction": "w",
        "id": 9
      },
      {
        "direction": "e",
        "id": 11
      }
    ]
  },
  {
    "id": 11,
    "description": "A track that leads from East to West.",
    "move": [
      {
        "direction": "w",
        "id": 10
      },
      {
        "direction": "e",
        "id": 12
      }
    ]
  },
  {
    "id": 12,
    "description": "A track leads to the North East, or to the West.",
    "move": [
      {
        "direction": "w",
        "id": 11
      },
      {
        "direction": "ne",
        "id": 28
      }
    ]
  },
  {
    "id": 13,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 14
      }
    ]
  },
  {
    "id": 14,
    "description": "",
    "move": [
      {
        "direction": "nw",
        "id": 28
      },
      {
        "direction": "w",
        "id": 13
      },
      {
        "direction": "e",
        "id": 15
      }
    ]
  },
  {
    "id": 15,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 14
      },
      {
        "direction": "e",
        "id": 16
      },
      {
        "direction": "ne",
        "id": 25
      }
    ]
  },
  {
    "id": 16,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 15
      }
    ]
  },
  {
    "id": 17,
    "description": "",
    "move": [
      {
        "direction": "ne",
        "id": 23
      },
      {
        "direction": "nw",
        "id": 25
      },
      {
        "direction": "e",
        "id": 18
      }
    ]
  },
  {
    "id": 18,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 17
      },
      {
        "direction": "e",
        "id": 19
      }
    ]
  },
  {
    "id": 19,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 18
      },
      {
        "direction": "e",
        "id": 20
      },
      {
        "direction": "ne",
        "id": 21
      }
    ]
  },
  {
    "id": 20,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 19
      }
    ]
  },
  {
    "id": 21,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 22
      },
      {
        "direction": "sw",
        "id": 19
      }
    ]
  },
  {
    "id": 22,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 23
      },
      {
        "direction": "e",
        "id": 21
      }
    ]
  },
  {
    "id": 23,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 17
      },
      {
        "direction": "w",
        "id": 24
      },
      {
        "direction": "n",
        "id": 58
      },
      {
        "direction": "e",
        "id": 22
      }
    ]
  },
  {
    "id": 24,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 25
      },
      {
        "direction": "e",
        "id": 23
      },
      {
        "direction": "n",
        "id": 57
      }
    ]
  },
  {
    "id": 25,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 26
      },
      {
        "direction": "sw",
        "id": 15
      },
      {
        "direction": "se",
        "id": 17
      },
      {
        "direction": "e",
        "id": 24
      },
      {
        "direction": "nw",
        "id": 55
      }
    ]
  },
  {
    "id": 26,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 27
      },
      {
        "direction": "e",
        "id": 25
      }
    ]
  },
  {
    "id": 27,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 28
      },
      {
        "direction": "e",
        "id": 26
      }
    ]
  },
  {
    "id": 28,
    "description": "At a crossroads. Roads lead North East, East, South East, and South West. A path disappears into the trees to the West.",
    "move": [
      {
        "direction": "sw",
        "id": 12
      },
      {
        "direction": "w",
        "id": 29
      },
      {
        "direction": "nw",
        "id": 52
      },
      {
        "direction": "ne",
        "id": 54
      },
      {
        "direction": "se",
        "id": 14
      },
      {
        "direction": "e",
        "id": 27
      }
    ]
  },
  {
    "id": 29,
    "description": "In Grassland. There are trees to the North West, and a road in the East.",
    "move": [
      {
        "direction": "e",
        "id": 28
      },
      {
        "direction": "nw",
        "id": 51
      }
    ]
  },
  {
    "id": 30,
    "description": "A clearing in the trees. The road is to the West, and the forest is North.",
    "move": [
      {
        "direction": "n",
        "id": 51
      },
      {
        "direction": "w",
        "id": 31
      }
    ]
  },
  {
    "id": 31,
    "description": "There is a wooden gate to the South. A road leads North West. A small trail leads into the trees to the West. There is a clearing to the East.",
    "move": [
      {
        "direction": "s",
        "id": 10
      },
      {
        "direction": "nw",
        "id": 49
      },
      {
        "direction": "w",
        "id": 32
      },
      {
        "direction": "e",
        "id": 30
      }
    ]
  },
  {
    "id": 32,
    "description": "A trail leads towards the road in the East, or away to the West.",
    "move": [
      {
        "direction": "e",
        "id": 31
      },
      {
        "direction": "w",
        "id": 33
      }
    ]
  },
  {
    "id": 33,
    "description": "The trail leads East or West past some trees.",
    "move": [
      {
        "direction": "e",
        "id": 32
      },
      {
        "direction": "w",
        "id": 34
      }
    ]
  },
  {
    "id": 34,
    "description": "On a dusty road. Roads lead North West, South West and South East. There is a dense copse of trees to the North East.",
    "move": [
      {
        "direction": "e",
        "id": 33
      },
      {
        "direction": "se",
        "id": 8
      },
      {
        "direction": "ne",
        "id": 48
      },
      {
        "direction": "nw",
        "id": 46
      },
      {
        "direction": "sw",
        "id": 6
      }
    ]
  },
  {
    "id": 35,
    "description": "A small underground cave",
    "move": [
      {
        "direction": "w",
        "id": 36
      }
    ]
  },
  {
    "id": 36,
    "description": "A large cave with light filtering down from above. There seem to be smaller caves to East and West",
    "move": [
      {
        "direction": "nw",
        "id": 44
      },
      {
        "direction": "e",
        "id": 35
      },
      {
        "direction": "w",
        "id": 37
      }
    ]
  },
  {
    "id": 37,
    "description": "A small underground cave",
    "move": [
      {
        "direction": "e",
        "id": 36
      }
    ]
  },
  {
    "id": 38,
    "description": "This looks like a mining camp. A tunnel leads down into the ground to the North",
    "move": [
      {
        "direction": "se",
        "id": 4
      },
      {
        "direction": "n",
        "id": 43
      }
    ]
  },
  {
    "id": 39,
    "description": "The tunnel continues North to South",
    "move": [
      {
        "direction": "n",
        "id": 42
      },
      {
        "direction": "s",
        "id": 2
      }
    ]
  },
  {
    "id": 40,
    "description": "The tunnel continues North to South",
    "move": [
      {
        "direction": "s",
        "id": 1
      },
      {
        "direction": "n",
        "id": 41
      }
    ]
  },
  {
    "id": 41,
    "description": "A collapse is blocking most of this cave. There is a small tunnel to the South",
    "move": [
      {
        "direction": "s",
        "id": 40
      },
      {
        "direction": "e",
        "id": 42
      }
    ]
  },
  {
    "id": 42,
    "description": "This small cave has exits East, West and South",
    "move": [
      {
        "direction": "e",
        "id": 43
      },
      {
        "direction": "s",
        "id": 39
      },
      {
        "direction": "w",
        "id": 41
      }
    ]
  },
  {
    "id": 43,
    "description": "The tunnel splits at a junction",
    "move": [
      {
        "direction": "s",
        "id": 38
      },
      {
        "direction": "e",
        "id": 44
      },
      {
        "direction": "w",
        "id": 42
      }
    ]
  },
  {
    "id": 44,
    "description": "This is a small cave with another tunnel leading South East",
    "move": [
      {
        "direction": "w",
        "id": 43
      },
      {
        "direction": "se",
        "id": 36
      }
    ]
  },
  {
    "id": 45,
    "description": "The road leads North West or East.",
    "move": [
      {
        "direction": "nw",
        "id": 77
      },
      {
        "direction": "e",
        "id": 46
      }
    ]
  },
  {
    "id": 46,
    "description": "The road here leads West or South East. There is a small clearing in the trees to the East",
    "move": [
      {
        "direction": "w",
        "id": 45
      },
      {
        "direction": "e",
        "id": 47
      },
      {
        "direction": "se",
        "id": 34
      }
    ]
  },
  {
    "id": 47,
    "description": "A small clearing in the trees",
    "move": [
      {
        "direction": "w",
        "id": 46
      }
    ]
  },
  {
    "id": 48,
    "description": "Inside a dense copse of trees",
    "move": [
      {
        "direction": "e",
        "id": 49
      },
      {
        "direction": "sw",
        "id": 34
      }
    ]
  },
  {
    "id": 49,
    "description": "On the North to South road. There is a track leading into the trees to the West.",
    "move": [
      {
        "direction": "se",
        "id": 31
      },
      {
        "direction": "ne",
        "id": 71
      },
      {
        "direction": "w",
        "id": 48
      }
    ]
  },
  {
    "id": 50,
    "description": "A hidden corner of the forest, with trails leading East and North East.",
    "move": [
      {
        "direction": "ne",
        "id": 70
      },
      {
        "direction": "e",
        "id": 51
      }
    ]
  },
  {
    "id": 51,
    "description": "The forest. Paths lead deeper into the trees to the North and North East, or back into the open to the South and South East. A narrow trail leads West.",
    "move": [
      {
        "direction": "n",
        "id": 70
      },
      {
        "direction": "w",
        "id": 50
      },
      {
        "direction": "s",
        "id": 30
      },
      {
        "direction": "se",
        "id": 29
      },
      {
        "direction": "ne",
        "id": 69
      }
    ]
  },
  {
    "id": 52,
    "description": "Deep in the forest. Small tracks lead North and South East.",
    "move": [
      {
        "direction": "se",
        "id": 28
      },
      {
        "direction": "n",
        "id": 69
      },
      {
        "direction": "e",
        "id": 53
      }
    ]
  },
  {
    "id": 53,
    "description": "A hidden glade in the forest. The only exit is West.",
    "move": [
      {
        "direction": "w",
        "id": 52
      }
    ]
  },
  {
    "id": 54,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 28
      },
      {
        "direction": "e",
        "id": 55
      },
      {
        "direction": "nw",
        "id": 68
      }
    ]
  },
  {
    "id": 55,
    "description": "",
    "move": [
      {
        "direction": "se",
        "id": 25
      },
      {
        "direction": "w",
        "id": 54
      },
      {
        "direction": "e",
        "id": 56
      }
    ]
  },
  {
    "id": 56,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 55
      },
      {
        "direction": "ne",
        "id": 64
      }
    ]
  },
  {
    "id": 57,
    "description": "",
    "move": [
      {
        "direction": "s",
        "id": 24
      }
    ]
  },
  {
    "id": 58,
    "description": "",
    "move": [
      {
        "direction": "s",
        "id": 23
      }
    ]
  },
  {
    "id": 59,
    "description": "",
    "move": [
      {
        "direction": "n",
        "id": 62
      },
      {
        "direction": "e",
        "id": 60
      }
    ]
  },
  {
    "id": 60,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 59
      }
    ]
  },
  {
    "id": 61,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 62
      }
    ]
  },
  {
    "id": 62,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 63
      },
      {
        "direction": "e",
        "id": 61
      },
      {
        "direction": "s",
        "id": 59
      }
    ]
  },
  {
    "id": 63,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 64
      },
      {
        "direction": "e",
        "id": 62
      }
    ]
  },
  {
    "id": 64,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 56
      },
      {
        "direction": "w",
        "id": 65
      },
      {
        "direction": "nw",
        "id": 96
      },
      {
        "direction": "e",
        "id": 63
      },
      {
        "direction": "ne",
        "id": 98
      }
    ]
  },
  {
    "id": 65,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 64
      },
      {
        "direction": "w",
        "id": 66
      }
    ]
  },
  {
    "id": 66,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 65
      },
      {
        "direction": "w",
        "id": 67
      }
    ]
  },
  {
    "id": 67,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 66
      }
    ]
  },
  {
    "id": 68,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 69
      },
      {
        "direction": "se",
        "id": 54
      },
      {
        "direction": "nw",
        "id": 92
      },
      {
        "direction": "ne",
        "id": 94
      },
      {
        "direction": "n",
        "id": 93
      }
    ]
  },
  {
    "id": 69,
    "description": "Deep in the forest. Trails lead West, South West and South, and there is a road to the East.",
    "move": [
      {
        "direction": "s",
        "id": 52
      },
      {
        "direction": "w",
        "id": 70
      },
      {
        "direction": "sw",
        "id": 51
      },
      {
        "direction": "e",
        "id": 68
      }
    ]
  },
  {
    "id": 70,
    "description": "Deep in the forest. Trails lead East and West, and also to the South and South West.",
    "move": [
      {
        "direction": "w",
        "id": 71
      },
      {
        "direction": "s",
        "id": 51
      },
      {
        "direction": "sw",
        "id": 50
      },
      {
        "direction": "e",
        "id": 69
      }
    ]
  },
  {
    "id": 71,
    "description": "On the North to South road, which turns West here. There is a forest to the East.",
    "move": [
      {
        "direction": "sw",
        "id": 49
      },
      {
        "direction": "w",
        "id": 72
      },
      {
        "direction": "e",
        "id": 70
      }
    ]
  },
  {
    "id": 72,
    "description": "A fork in the road. North East road leads towards a small village. There is a small track into the woods to the North",
    "move": [
      {
        "direction": "e",
        "id": 71
      },
      {
        "direction": "ne",
        "id": 90
      },
      {
        "direction": "nw",
        "id": 88
      },
      {
        "direction": "n",
        "id": 89
      }
    ]
  },
  {
    "id": 73,
    "description": "A large circular hall deep underground. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 74
      }
    ]
  },
  {
    "id": 74,
    "description": "A small chamber with exits to the North, East and West",
    "move": [
      {
        "direction": "n",
        "id": 87
      },
      {
        "direction": "w",
        "id": 75
      },
      {
        "direction": "e",
        "id": 73
      }
    ]
  },
  {
    "id": 75,
    "description": "The East to West tunnel has a fork to the North.",
    "move": [
      {
        "direction": "w",
        "id": 76
      },
      {
        "direction": "n",
        "id": 86
      },
      {
        "direction": "e",
        "id": 74
      }
    ]
  },
  {
    "id": 76,
    "description": "A small chamber with exits to the North and East",
    "move": [
      {
        "direction": "n",
        "id": 85
      },
      {
        "direction": "e",
        "id": 75
      }
    ]
  },
  {
    "id": 77,
    "description": "The road leads West or South East. There is a large cave entrance to the North West",
    "move": [
      {
        "direction": "w",
        "id": 78
      },
      {
        "direction": "nw",
        "id": 83
      },
      {
        "direction": "se",
        "id": 45
      }
    ]
  },
  {
    "id": 78,
    "description": "The road leads West or East. There is a large cave entrance to the North",
    "move": [
      {
        "direction": "e",
        "id": 77
      },
      {
        "direction": "n",
        "id": 83
      },
      {
        "direction": "w",
        "id": 79
      }
    ]
  },
  {
    "id": 79,
    "description": "There are small buildings to the West. The road leads East.",
    "move": [
      {
        "direction": "e",
        "id": 78
      },
      {
        "direction": "w",
        "id": 80
      }
    ]
  },
  {
    "id": 80,
    "description": "The witch's hut",
    "move": [
      {
        "direction": "e",
        "id": 79
      }
    ]
  },
  {
    "id": 81,
    "description": "A small widening of the tunnel as it turns North",
    "move": [
      {
        "direction": "e",
        "id": 82
      },
      {
        "direction": "n",
        "id": 120
      }
    ]
  },
  {
    "id": 82,
    "description": "The tunnel goes steeply down towards the West",
    "move": [
      {
        "direction": "e",
        "id": 83
      },
      {
        "direction": "w",
        "id": 81
      }
    ]
  },
  {
    "id": 83,
    "description": "A large cave entrance. Tunnels lead down into the dark to the East or West",
    "move": [
      {
        "direction": "se",
        "id": 77
      },
      {
        "direction": "s",
        "id": 78
      },
      {
        "direction": "w",
        "id": 82
      },
      {
        "direction": "e",
        "id": 84
      }
    ]
  },
  {
    "id": 84,
    "description": "The East to West tunnel has a fork to the North.",
    "move": [
      {
        "direction": "w",
        "id": 83
      },
      {
        "direction": "e",
        "id": 85
      },
      {
        "direction": "n",
        "id": 117
      }
    ]
  },
  {
    "id": 85,
    "description": "A large chamber at a crossroads deep underground",
    "move": [
      {
        "direction": "w",
        "id": 84
      },
      {
        "direction": "s",
        "id": 76
      },
      {
        "direction": "n",
        "id": 116
      },
      {
        "direction": "e",
        "id": 86
      }
    ]
  },
  {
    "id": 86,
    "description": "The East to West tunnel has a fork to the South.",
    "move": [
      {
        "direction": "w",
        "id": 85
      },
      {
        "direction": "s",
        "id": 75
      },
      {
        "direction": "e",
        "id": 87
      }
    ]
  },
  {
    "id": 87,
    "description": "A small chamber with exits to the South and West",
    "move": [
      {
        "direction": "w",
        "id": 86
      },
      {
        "direction": "s",
        "id": 74
      }
    ]
  },
  {
    "id": 88,
    "description": "The road goes from the North West to the South East",
    "move": [
      {
        "direction": "se",
        "id": 72
      },
      {
        "direction": "nw",
        "id": 114
      }
    ]
  },
  {
    "id": 89,
    "description": "A small track leads into the woods behind the village",
    "move": [
      {
        "direction": "s",
        "id": 72
      },
      {
        "direction": "n",
        "id": 112
      }
    ]
  },
  {
    "id": 90,
    "description": "The village, outside the blacksmith's shop. The main village square is East.",
    "move": [
      {
        "direction": "sw",
        "id": 72
      },
      {
        "direction": "e",
        "id": 91
      }
    ]
  },
  {
    "id": 91,
    "description": "The village square. There is a blacksmith shop to the West, and a tavern to the North.",
    "move": [
      {
        "direction": "w",
        "id": 90
      },
      {
        "direction": "n",
        "id": 110
      },
      {
        "direction": "e",
        "id": 92
      }
    ]
  },
  {
    "id": 92,
    "description": "",
    "move": [
      {
        "direction": "se",
        "id": 68
      },
      {
        "direction": "w",
        "id": 91
      }
    ]
  },
  {
    "id": 93,
    "description": "",
    "move": [
      {
        "direction": "s",
        "id": 68
      },
      {
        "direction": "ne",
        "id": 107
      },
      {
        "direction": "e",
        "id": 94
      }
    ]
  },
  {
    "id": 94,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 68
      },
      {
        "direction": "e",
        "id": 95
      },
      {
        "direction": "w",
        "id": 93
      }
    ]
  },
  {
    "id": 95,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 94
      },
      {
        "direction": "e",
        "id": 96
      },
      {
        "direction": "ne",
        "id": 105
      }
    ]
  },
  {
    "id": 96,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 95
      },
      {
        "direction": "se",
        "id": 64
      },
      {
        "direction": "ne",
        "id": 104
      }
    ]
  },
  {
    "id": 97,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 98
      }
    ]
  },
  {
    "id": 98,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 64
      },
      {
        "direction": "e",
        "id": 99
      },
      {
        "direction": "w",
        "id": 97
      }
    ]
  },
  {
    "id": 99,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 98
      },
      {
        "direction": "e",
        "id": 100
      },
      {
        "direction": "n",
        "id": 102
      }
    ]
  },
  {
    "id": 100,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 99
      },
      {
        "direction": "n",
        "id": 101
      }
    ]
  },
  {
    "id": 101,
    "description": "",
    "move": [
      {
        "direction": "s",
        "id": 100
      },
      {
        "direction": "w",
        "id": 102
      }
    ]
  },
  {
    "id": 102,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 101
      },
      {
        "direction": "s",
        "id": 99
      },
      {
        "direction": "w",
        "id": 103
      }
    ]
  },
  {
    "id": 103,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 102
      },
      {
        "direction": "w",
        "id": 104
      }
    ]
  },
  {
    "id": 104,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 96
      },
      {
        "direction": "e",
        "id": 103
      }
    ]
  },
  {
    "id": 105,
    "description": "",
    "move": [
      {
        "direction": "nw",
        "id": 135
      },
      {
        "direction": "sw",
        "id": 95
      }
    ]
  },
  {
    "id": 106,
    "description": "",
    "move": [
      {
        "direction": "n",
        "id": 135
      }
    ]
  },
  {
    "id": 107,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 93
      },
      {
        "direction": "ne",
        "id": 135
      },
      {
        "direction": "w",
        "id": 108
      }
    ]
  },
  {
    "id": 108,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 107
      },
      {
        "direction": "w",
        "id": 109
      }
    ]
  },
  {
    "id": 109,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 108
      },
      {
        "direction": "ne",
        "id": 133
      }
    ]
  },
  {
    "id": 110,
    "description": "The village tavern. The exit is to the South.",
    "move": [
      {
        "direction": "s",
        "id": 91
      }
    ]
  },
  {
    "id": 111,
    "description": "A sheltered clearing in the woods",
    "move": [
      {
        "direction": "w",
        "id": 112
      }
    ]
  },
  {
    "id": 112,
    "description": "A clearing in the woods with tracks to the East, West and South",
    "move": [
      {
        "direction": "s",
        "id": 89
      },
      {
        "direction": "e",
        "id": 111
      },
      {
        "direction": "w",
        "id": 113
      }
    ]
  },
  {
    "id": 113,
    "description": "A sheltered clearing in the woods",
    "move": [
      {
        "direction": "e",
        "id": 112
      }
    ]
  },
  {
    "id": 114,
    "description": "The road forks to the West and North East, or South East",
    "move": [
      {
        "direction": "se",
        "id": 88
      },
      {
        "direction": "w",
        "id": 115
      },
      {
        "direction": "ne",
        "id": 128
      }
    ]
  },
  {
    "id": 115,
    "description": "The road bends around to the North West",
    "move": [
      {
        "direction": "e",
        "id": 114
      },
      {
        "direction": "nw",
        "id": 125
      }
    ]
  },
  {
    "id": 116,
    "description": "A medium sized chamber with exits to the West and South",
    "move": [
      {
        "direction": "w",
        "id": 117
      },
      {
        "direction": "s",
        "id": 85
      }
    ]
  },
  {
    "id": 117,
    "description": "A small damp chamber with exits to the East and South",
    "move": [
      {
        "direction": "s",
        "id": 84
      },
      {
        "direction": "e",
        "id": 116
      }
    ]
  },
  {
    "id": 118,
    "description": "A peaceful and prosperous village. There is a general store to the North",
    "move": [
      {
        "direction": "ne",
        "id": 124
      },
      {
        "direction": "w",
        "id": 119
      },
      {
        "direction": "n",
        "id": 123
      }
    ]
  },
  {
    "id": 119,
    "description": "A peaceful and prosperous village. There is an inn to the North West, and a small alley directly North",
    "move": [
      {
        "direction": "e",
        "id": 118
      },
      {
        "direction": "nw",
        "id": 121
      },
      {
        "direction": "n",
        "id": 122
      }
    ]
  },
  {
    "id": 120,
    "description": "A large cavern with light from above",
    "move": [
      {
        "direction": "s",
        "id": 81
      }
    ]
  },
  {
    "id": 121,
    "description": "The village inn",
    "move": [
      {
        "direction": "se",
        "id": 119
      }
    ]
  },
  {
    "id": 122,
    "description": "A small work area behind the general store",
    "move": [
      {
        "direction": "s",
        "id": 119
      }
    ]
  },
  {
    "id": 123,
    "description": "The village general store",
    "move": [
      {
        "direction": "s",
        "id": 118
      }
    ]
  },
  {
    "id": 124,
    "description": "The road turns South West into the village",
    "move": [
      {
        "direction": "sw",
        "id": 118
      },
      {
        "direction": "e",
        "id": 125
      }
    ]
  },
  {
    "id": 125,
    "description": "The road West towards a small village in the distance",
    "move": [
      {
        "direction": "se",
        "id": 115
      },
      {
        "direction": "w",
        "id": 124
      },
      {
        "direction": "e",
        "id": 126
      }
    ]
  },
  {
    "id": 126,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 125
      },
      {
        "direction": "e",
        "id": 127
      }
    ]
  },
  {
    "id": 127,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 126
      },
      {
        "direction": "e",
        "id": 128
      }
    ]
  },
  {
    "id": 128,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 114
      },
      {
        "direction": "w",
        "id": 127
      },
      {
        "direction": "e",
        "id": 129
      }
    ]
  },
  {
    "id": 129,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 128
      }
    ]
  },
  {
    "id": 130,
    "description": "",
    "move": []
  },
  {
    "id": 131,
    "description": "",
    "move": []
  },
  {
    "id": 132,
    "description": "",
    "move": []
  },
  {
    "id": 133,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 134
      },
      {
        "direction": "sw",
        "id": 109
      }
    ]
  },
  {
    "id": 134,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 133
      },
      {
        "direction": "e",
        "id": 135
      }
    ]
  },
  {
    "id": 135,
    "description": "",
    "move": [
      {
        "direction": "sw",
        "id": 107
      },
      {
        "direction": "se",
        "id": 105
      },
      {
        "direction": "w",
        "id": 134
      },
      {
        "direction": "s",
        "id": 106
      }
    ]
  },
  {
    "id": 136,
    "description": "",
    "move": []
  },
  {
    "id": 137,
    "description": "",
    "move": []
  },
  {
    "id": 138,
    "description": "",
    "move": []
  },
  {
    "id": 139,
    "description": "",
    "move": []
  },
  {
    "id": 140,
    "description": "",
    "move": []
  },
  {
    "id": 141,
    "description": "",
    "move": []
  },
  {
    "id": 142,
    "description": "",
    "move": []
  },
  {
    "id": 143,
    "description": "",
    "move": []
  },
  {
    "id": 144,
    "description": "",
    "move": []
  },
  {
    "id": 145,
    "description": "",
    "move": []
  },
  {
    "id": 146,
    "description": "",
    "move": []
  },
  {
    "id": 147,
    "description": "",
    "move": []
  },
  {
    "id": 148,
    "description": "",
    "move": []
  },
  {
    "id": 149,
    "description": "",
    "move": []
  },
  {
    "id": 150,
    "description": "",
    "move": []
  },
  {
    "id": 151,
    "description": "",
    "move": []
  },
  {
    "id": 152,
    "description": "",
    "move": []
  },
  {
    "id": 153,
    "description": "",
    "move": []
  },
  {
    "id": 154,
    "description": "",
    "move": []
  },
  {
    "id": 155,
    "description": "",
    "move": []
  },
  {
    "id": 156,
    "description": "",
    "move": []
  },
  {
    "id": 157,
    "description": "",
    "move": []
  },
  {
    "id": 158,
    "description": "",
    "move": []
  },
  {
    "id": 159,
    "description": "",
    "move": []
  },
  {
    "id": 160,
    "description": "",
    "move": []
  },
  {
    "id": 161,
    "description": "",
    "move": []
  },
  {
    "id": 162,
    "description": "",
    "move": []
  },
  {
    "id": 163,
    "description": "",
    "move": []
  },
  {
    "id": 164,
    "description": "",
    "move": []
  },
  {
    "id": 165,
    "description": "",
    "move": []
  },
  {
    "id": 166,
    "description": "",
    "move": []
  },
  {
    "id": 167,
    "description": "",
    "move": []
  },
  {
    "id": 168,
    "description": "",
    "move": []
  },
  {
    "id": 169,
    "description": "",
    "move": []
  },
  {
    "id": 170,
    "description": "",
    "move": []
  },
  {
    "id": 171,
    "description": "",
    "move": []
  },
  {
    "id": 172,
    "description": "",
    "move": []
  },
  {
    "id": 173,
    "description": "",
    "move": []
  },
  {
    "id": 174,
    "description": "",
    "move": []
  },
  {
    "id": 175,
    "description": "",
    "move": []
  },
  {
    "id": 176,
    "description": "",
    "move": []
  },
  {
    "id": 177,
    "description": "",
    "move": []
  },
  {
    "id": 178,
    "description": "",
    "move": []
  },
  {
    "id": 179,
    "description": "",
    "move": []
  },
  {
    "id": 180,
    "description": "",
    "move": []
  },
  {
    "id": 181,
    "description": "",
    "move": []
  },
  {
    "id": 182,
    "description": "",
    "move": []
  },
  {
    "id": 183,
    "description": "",
    "move": []
  },
  {
    "id": 184,
    "description": "",
    "move": []
  },
  {
    "id": 185,
    "description": "",
    "move": []
  },
  {
    "id": 186,
    "description": "",
    "move": []
  },
  {
    "id": 187,
    "description": "",
    "move": []
  },
  {
    "id": 188,
    "description": "",
    "move": []
  },
  {
    "id": 189,
    "description": "",
    "move": []
  },
  {
    "id": 190,
    "description": "",
    "move": []
  },
  {
    "id": 191,
    "description": "",
    "move": []
  },
  {
    "id": 192,
    "description": "",
    "move": []
  },
  {
    "id": 193,
    "description": "",
    "move": []
  },
  {
    "id": 194,
    "description": "",
    "move": []
  },
  {
    "id": 195,
    "description": "",
    "move": []
  },
  {
    "id": 196,
    "description": "",
    "move": []
  },
  {
    "id": 197,
    "description": "",
    "move": []
  },
  {
    "id": 198,
    "description": "",
    "move": []
  },
  {
    "id": 199,
    "description": "",
    "move": []
  },
  {
    "id": 200,
    "description": "",
    "move": []
  },
  {
    "id": 201,
    "description": "",
    "move": []
  },
  {
    "id": 202,
    "description": "",
    "move": []
  },
  {
    "id": 203,
    "description": "",
    "move": []
  },
  {
    "id": 204,
    "description": "",
    "move": []
  },
  {
    "id": 205,
    "description": "",
    "move": []
  },
  {
    "id": 206,
    "description": "",
    "move": []
  },
  {
    "id": 207,
    "description": "",
    "move": []
  },
  {
    "id": 208,
    "description": "",
    "move": []
  },
  {
    "id": 209,
    "description": "",
    "move": []
  },
  {
    "id": 210,
    "description": "",
    "move": []
  },
  {
    "id": 211,
    "description": "",
    "move": []
  },
  {
    "id": 212,
    "description": "",
    "move": []
  },
  {
    "id": 213,
    "description": "",
    "move": []
  },
  {
    "id": 214,
    "description": "",
    "move": []
  },
  {
    "id": 215,
    "description": "",
    "move": []
  },
  {
    "id": 216,
    "description": "",
    "move": []
  },
  {
    "id": 217,
    "description": "",
    "move": []
  },
  {
    "id": 218,
    "description": "",
    "move": []
  },
  {
    "id": 219,
    "description": "",
    "move": []
  },
  {
    "id": 220,
    "description": "",
    "move": []
  },
  {
    "id": 221,
    "description": "",
    "move": []
  },
  {
    "id": 222,
    "description": "",
    "move": []
  },
  {
    "id": 223,
    "description": "",
    "move": []
  },
  {
    "id": 224,
    "description": "",
    "move": []
  },
  {
    "id": 225,
    "description": "",
    "move": []
  },
  {
    "id": 226,
    "description": "",
    "move": []
  },
  {
    "id": 227,
    "description": "",
    "move": []
  },
  {
    "id": 228,
    "description": "",
    "move": []
  },
  {
    "id": 229,
    "description": "",
    "move": []
  },
  {
    "id": 230,
    "description": "",
    "move": []
  },
  {
    "id": 231,
    "description": "",
    "move": []
  },
  {
    "id": 232,
    "description": "",
    "move": []
  },
  {
    "id": 233,
    "description": "",
    "move": []
  },
  {
    "id": 234,
    "description": "",
    "move": []
  },
  {
    "id": 235,
    "description": "",
    "move": []
  },
  {
    "id": 236,
    "description": "",
    "move": []
  },
  {
    "id": 237,
    "description": "",
    "move": []
  },
  {
    "id": 238,
    "description": "",
    "move": []
  },
  {
    "id": 239,
    "description": "",
    "move": []
  },
  {
    "id": 240,
    "description": "",
    "move": []
  }
];
