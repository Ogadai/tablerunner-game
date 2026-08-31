import { Location } from './types';

export const cauldronOfFire: Location[] = [
  {
    "id": 1,
    "description": "",
    "move": []
  },
  {
    "id": 2,
    "description": "",
    "move": []
  },
  {
    "id": 3,
    "description": "",
    "move": []
  },
  {
    "id": 4,
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 5
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
    "move": []
  },
  {
    "id": 14,
    "description": "",
    "move": [
      {
        "direction": "nw",
        "id": 28
      }
    ]
  },
  {
    "id": 15,
    "description": "",
    "move": []
  },
  {
    "id": 16,
    "description": "",
    "move": []
  },
  {
    "id": 17,
    "description": "",
    "move": []
  },
  {
    "id": 18,
    "description": "",
    "move": []
  },
  {
    "id": 19,
    "description": "",
    "move": []
  },
  {
    "id": 20,
    "description": "",
    "move": []
  },
  {
    "id": 21,
    "description": "",
    "move": []
  },
  {
    "id": 22,
    "description": "",
    "move": []
  },
  {
    "id": 23,
    "description": "",
    "move": []
  },
  {
    "id": 24,
    "description": "",
    "move": []
  },
  {
    "id": 25,
    "description": "",
    "move": []
  },
  {
    "id": 26,
    "description": "",
    "move": []
  },
  {
    "id": 27,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 28
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
    "description": "",
    "move": []
  },
  {
    "id": 36,
    "description": "",
    "move": []
  },
  {
    "id": 37,
    "description": "",
    "move": []
  },
  {
    "id": 38,
    "description": "",
    "move": []
  },
  {
    "id": 39,
    "description": "",
    "move": []
  },
  {
    "id": 40,
    "description": "",
    "move": []
  },
  {
    "id": 41,
    "description": "",
    "move": []
  },
  {
    "id": 42,
    "description": "",
    "move": []
  },
  {
    "id": 43,
    "description": "",
    "move": []
  },
  {
    "id": 44,
    "description": "",
    "move": []
  },
  {
    "id": 45,
    "description": "",
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
    "description": "",
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
    "description": "",
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
      }
    ]
  },
  {
    "id": 55,
    "description": "",
    "move": []
  },
  {
    "id": 56,
    "description": "",
    "move": []
  },
  {
    "id": 57,
    "description": "",
    "move": []
  },
  {
    "id": 58,
    "description": "",
    "move": []
  },
  {
    "id": 59,
    "description": "",
    "move": []
  },
  {
    "id": 60,
    "description": "",
    "move": []
  },
  {
    "id": 61,
    "description": "",
    "move": []
  },
  {
    "id": 62,
    "description": "",
    "move": []
  },
  {
    "id": 63,
    "description": "",
    "move": []
  },
  {
    "id": 64,
    "description": "",
    "move": []
  },
  {
    "id": 65,
    "description": "",
    "move": []
  },
  {
    "id": 66,
    "description": "",
    "move": []
  },
  {
    "id": 67,
    "description": "",
    "move": []
  },
  {
    "id": 68,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 69
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
    "description": "A fork in the road. The East road leads towards a small village.",
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
      }
    ]
  },
  {
    "id": 73,
    "description": "",
    "move": [
      {
        "direction": "w",
        "id": 74
      }
    ]
  },
  {
    "id": 74,
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
    "move": [
      {
        "direction": "e",
        "id": 79
      }
    ]
  },
  {
    "id": 81,
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
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
    "description": "",
    "move": [
      {
        "direction": "se",
        "id": 72
      }
    ]
  },
  {
    "id": 89,
    "description": "",
    "move": []
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
      }
    ]
  },
  {
    "id": 92,
    "description": "",
    "move": []
  },
  {
    "id": 93,
    "description": "",
    "move": []
  },
  {
    "id": 94,
    "description": "",
    "move": []
  },
  {
    "id": 95,
    "description": "",
    "move": []
  },
  {
    "id": 96,
    "description": "",
    "move": []
  },
  {
    "id": 97,
    "description": "",
    "move": []
  },
  {
    "id": 98,
    "description": "",
    "move": []
  },
  {
    "id": 99,
    "description": "",
    "move": []
  },
  {
    "id": 100,
    "description": "",
    "move": []
  },
  {
    "id": 101,
    "description": "",
    "move": []
  },
  {
    "id": 102,
    "description": "",
    "move": []
  },
  {
    "id": 103,
    "description": "",
    "move": []
  },
  {
    "id": 104,
    "description": "",
    "move": []
  },
  {
    "id": 105,
    "description": "",
    "move": []
  },
  {
    "id": 106,
    "description": "",
    "move": []
  },
  {
    "id": 107,
    "description": "",
    "move": []
  },
  {
    "id": 108,
    "description": "",
    "move": []
  },
  {
    "id": 109,
    "description": "",
    "move": []
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
    "description": "",
    "move": []
  },
  {
    "id": 112,
    "description": "",
    "move": []
  },
  {
    "id": 113,
    "description": "",
    "move": []
  },
  {
    "id": 114,
    "description": "",
    "move": []
  },
  {
    "id": 115,
    "description": "",
    "move": []
  },
  {
    "id": 116,
    "description": "",
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
    "description": "",
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
    "description": "",
    "move": []
  },
  {
    "id": 119,
    "description": "",
    "move": []
  },
  {
    "id": 120,
    "description": "",
    "move": [
      {
        "direction": "s",
        "id": 81
      }
    ]
  },
  {
    "id": 121,
    "description": "",
    "move": []
  },
  {
    "id": 122,
    "description": "",
    "move": []
  },
  {
    "id": 123,
    "description": "",
    "move": []
  },
  {
    "id": 124,
    "description": "",
    "move": []
  },
  {
    "id": 125,
    "description": "",
    "move": []
  },
  {
    "id": 126,
    "description": "",
    "move": []
  },
  {
    "id": 127,
    "description": "",
    "move": []
  },
  {
    "id": 128,
    "description": "",
    "move": []
  },
  {
    "id": 129,
    "description": "",
    "move": []
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
    "move": []
  },
  {
    "id": 134,
    "description": "",
    "move": []
  },
  {
    "id": 135,
    "description": "",
    "move": []
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
