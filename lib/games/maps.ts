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
    "description": "A hidden space under the trees. The only exit is East",
    "move": [
      {
        "direction": "e",
        "id": 14
      }
    ]
  },
  {
    "id": 14,
    "description": "A bend in the road, North West or East. A small trail heads into the trees to the West",
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
    "description": "The sandy road goes West or North East. A barely visible track leads up to some rocks in the East",
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
    "description": "A rocky outcrop. The only trail goes back West",
    "move": [
      {
        "direction": "w",
        "id": 15
      }
    ]
  },
  {
    "id": 17,
    "description": "Sandy hills. The road is to the North East or North West. A sandy trail leads up into the hills in the East",
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
    "description": "A sandy trail lead through the hills from West to East",
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
    "description": "A sandy trail lead through the hills from West to North East. A second trail leads behind a hill to the East",
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
    "description": "A shallow basin behind the rocks and sandy hills. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 19
      }
    ]
  },
  {
    "id": 21,
    "description": "The outskirts of a large village which is to the West. A sandy trail leads into the hills South West",
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
    "description": "The market of a large village. The main square is West. A healer's store is to the North. A path leads East",
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
    "description": "The main square of a large village. A tavern is to the North, and a market is East",
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
    "description": "The outskirts of a large village. A small shop lies North, and the main village square is East",
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
    "description": "At a crossroads. Roads lead North West, South East, and East. Track go West and South West",
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
    "description": "A rocky gorge with the only exits to the East and West",
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
    "description": "The trail leads up to some rocks in the East, or back down to the road in the West",
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
    "description": "At a crossroads. Roads lead North East, South East, and South West. A track goes East, and a path disappears into the trees to the West.",
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
    "description": "A fork in the road. North West, East or South West",
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
    "description": "A fork in the road. East, South East or West",
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
    "description": "A bend in the road. North East or West",
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
    "description": "A small shop",
    "move": [
      {
        "direction": "s",
        "id": 24
      }
    ]
  },
  {
    "id": 58,
    "description": "The village tavern",
    "move": [
      {
        "direction": "s",
        "id": 23
      }
    ]
  },
  {
    "id": 59,
    "description": "Behind the village tavern",
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
    "description": "Behind the healer's store",
    "move": [
      {
        "direction": "w",
        "id": 59
      }
    ]
  },
  {
    "id": 61,
    "description": "Behind the sandy hills in the desert",
    "move": [
      {
        "direction": "w",
        "id": 62
      }
    ]
  },
  {
    "id": 62,
    "description": "In the sandy hills in the desert. The main trail leads East and West, and a second trail goes South towards the back of the village",
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
    "description": "An East to West trail into the sandy hills on the edge of the desert",
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
    "description": "A crossroads at the edge of the desert",
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
    "description": "This small road leads East to West past some farm workers dwellings",
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
    "description": "This small road leads East to West past a large rocky hill",
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
    "description": "A large farm. The only road out is back East",
    "move": [
      {
        "direction": "e",
        "id": 66
      }
    ]
  },
  {
    "id": 68,
    "description": "A fork in the road. The road leads North West, North East, or South East, and a small track enters the forest to the West",
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
    "description": "A bend in the road, West or South East",
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
    "description": "The main road from the East turns to the North here",
    "move": [
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
    "description": "A fork in the road. The main road from the South turns to the West here. Another road goes East",
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
    "description": "A fork in the road. The main road goes West towards the forest, or East towards the desert. Another road heads North East",
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
    "description": "A fork in the desert road. North East, South East or West",
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
    "description": "A rocky hill top in the desert. The only way out is back East",
    "move": [
      {
        "direction": "e",
        "id": 98
      }
    ]
  },
  {
    "id": 98,
    "description": "The main road through the desert is East and South West. A path leads up the hill to the West",
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
    "description": "The main road through the desert is North and West. Another road leads East",
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
    "description": "The road ends suddenly. Only empty desert is ahead of you.",
    "move": [
      {
        "direction": "w",
        "id": 99
      }
    ]
  },
  {
    "id": 101,
    "description": "A large underground cavern with a pit in the center. The only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 140
      }
    ]
  },
  {
    "id": 102,
    "description": "The road turns to go deep into the desert. West or South. There is a cave entrance to the North",
    "move": [
      {
        "direction": "s",
        "id": 99
      },
      {
        "direction": "w",
        "id": 103
      },
      {
        "direction": "n",
        "id": 139
      }
    ]
  },
  {
    "id": 103,
    "description": "The road crosses the north edge of the desert. East or West",
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
    "description": "The road crosses the north edge of the desert. East or South West",
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
    "description": "The road goes through a rocky ravine. North West or South West",
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
    "description": "A small hiding place under the trees",
    "move": [
      {
        "direction": "n",
        "id": 135
      }
    ]
  },
  {
    "id": 107,
    "description": "The road heads North East or South West. There is a small trail leading West",
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
    "description": "A small trail leading East to West",
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
    "description": "A small trail behind the village tavern. The path leads North East or East",
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
    "description": "The village tavern. The exit is to the South. The back door goes North",
    "move": [
      {
        "direction": "s",
        "id": 91
      },
      {
        "direction": "n",
        "id": 131
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
    "description": "A small work area behind the general store. There is a hidden tunnel entrance behind a bush, leading North down under the ground.",
    "move": [
      {
        "direction": "s",
        "id": 119
      },
      {
        "direction": "n",
        "id": 159
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
    "description": "The road forks, leading North East, East or West",
    "move": [
      {
        "direction": "w",
        "id": 125
      },
      {
        "direction": "e",
        "id": 127
      },
      {
        "direction": "ne",
        "id": 154
      }
    ]
  },
  {
    "id": 127,
    "description": "The road travels West to East",
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
    "description": "The road forks, leading East, West or South West",
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
    "description": "The road forks, leading East, West or North West",
    "move": [
      {
        "direction": "w",
        "id": 128
      },
      {
        "direction": "e",
        "id": 130
      },
      {
        "direction": "nw",
        "id": 153
      }
    ]
  },
  {
    "id": 130,
    "description": "The road travels West to East",
    "move": [
      {
        "direction": "e",
        "id": 131
      },
      {
        "direction": "w",
        "id": 129
      }
    ]
  },
  {
    "id": 131,
    "description": "The road forks, leading East, West or North East. The back entrance of the village tavern is South",
    "move": [
      {
        "direction": "ne",
        "id": 149
      },
      {
        "direction": "e",
        "id": 132
      },
      {
        "direction": "w",
        "id": 130
      },
      {
        "direction": "s",
        "id": 110
      }
    ]
  },
  {
    "id": 132,
    "description": "The road travels West to East",
    "move": [
      {
        "direction": "w",
        "id": 131
      },
      {
        "direction": "e",
        "id": 133
      }
    ]
  },
  {
    "id": 133,
    "description": "The road travels West to East. There is a small trail leading South West",
    "move": [
      {
        "direction": "e",
        "id": 134
      },
      {
        "direction": "sw",
        "id": 109
      },
      {
        "direction": "w",
        "id": 132
      }
    ]
  },
  {
    "id": 134,
    "description": "The road travels West to East",
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
    "description": "A major crossroads, North West, North East, South East or South West. There is a trail into the trees in the West, and a path into the trees in the South",
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
      },
      {
        "direction": "ne",
        "id": 145
      },
      {
        "direction": "nw",
        "id": 147
      }
    ]
  },
  {
    "id": 136,
    "description": "The small tunnel in the East opens out into a large chamber lit by light filtering down from above",
    "move": [
      {
        "direction": "e",
        "id": 137
      }
    ]
  },
  {
    "id": 137,
    "description": "The East to West tunnel gets very narrow",
    "move": [
      {
        "direction": "e",
        "id": 138
      },
      {
        "direction": "w",
        "id": 136
      }
    ]
  },
  {
    "id": 138,
    "description": "A large chamber with exits North and West",
    "move": [
      {
        "direction": "n",
        "id": 143
      },
      {
        "direction": "w",
        "id": 137
      }
    ]
  },
  {
    "id": 139,
    "description": "The gave descends deep underground to the north, or South back to the surface",
    "move": [
      {
        "direction": "s",
        "id": 102
      },
      {
        "direction": "n",
        "id": 142
      }
    ]
  },
  {
    "id": 140,
    "description": "This tunnel goes from the North to the South",
    "move": [
      {
        "direction": "n",
        "id": 141
      },
      {
        "direction": "s",
        "id": 101
      }
    ]
  },
  {
    "id": 141,
    "description": "The tunnel from the West turns South",
    "move": [
      {
        "direction": "w",
        "id": 142
      },
      {
        "direction": "s",
        "id": 140
      }
    ]
  },
  {
    "id": 142,
    "description": "A T-junction in the underground tunnel. East or West, or South to the exit",
    "move": [
      {
        "direction": "s",
        "id": 139
      },
      {
        "direction": "e",
        "id": 141
      },
      {
        "direction": "w",
        "id": 143
      }
    ]
  },
  {
    "id": 143,
    "description": "A small hollow in the tunnel corner. East or South",
    "move": [
      {
        "direction": "e",
        "id": 142
      },
      {
        "direction": "s",
        "id": 138
      }
    ]
  },
  {
    "id": 144,
    "description": "The road turns sharply. North West or West",
    "move": [
      {
        "direction": "w",
        "id": 145
      },
      {
        "direction": "nw",
        "id": 176
      }
    ]
  },
  {
    "id": 145,
    "description": "The road turns East, or South West",
    "move": [
      {
        "direction": "sw",
        "id": 135
      },
      {
        "direction": "e",
        "id": 144
      }
    ]
  },
  {
    "id": 146,
    "description": "Hi dark hiding place under the trees. The only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 175
      }
    ]
  },
  {
    "id": 147,
    "description": "The road heads North East or South East. A small trail leads West",
    "move": [
      {
        "direction": "se",
        "id": 135
      },
      {
        "direction": "w",
        "id": 148
      },
      {
        "direction": "ne",
        "id": 175
      }
    ]
  },
  {
    "id": 148,
    "description": "A small trail through the trees, East to West",
    "move": [
      {
        "direction": "e",
        "id": 147
      },
      {
        "direction": "w",
        "id": 149
      }
    ]
  },
  {
    "id": 149,
    "description": "The road heads North or South West. A small trail leads East. A path leads towards the mountain in the West",
    "move": [
      {
        "direction": "e",
        "id": 148
      },
      {
        "direction": "n",
        "id": 172
      },
      {
        "direction": "sw",
        "id": 131
      },
      {
        "direction": "w",
        "id": 150
      }
    ]
  },
  {
    "id": 150,
    "description": "A path leads through the trees towards the mountain in the West",
    "move": [
      {
        "direction": "e",
        "id": 149
      },
      {
        "direction": "w",
        "id": 151
      }
    ]
  },
  {
    "id": 151,
    "description": "A sheltered valley in the shadow of the mountain. The only way out it East",
    "move": [
      {
        "direction": "e",
        "id": 150
      }
    ]
  },
  {
    "id": 152,
    "description": "A hidden space in the rocks. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 153
      }
    ]
  },
  {
    "id": 153,
    "description": "The road leads West or South East past camp in the open mouth of a cave to the north. A narrow path leads East/.",
    "move": [
      {
        "direction": "se",
        "id": 129
      },
      {
        "direction": "w",
        "id": 154
      },
      {
        "direction": "n",
        "id": 168
      },
      {
        "direction": "e",
        "id": 152
      }
    ]
  },
  {
    "id": 154,
    "description": "At a crossroads, with roads leading East, West or South West",
    "move": [
      {
        "direction": "e",
        "id": 153
      },
      {
        "direction": "sw",
        "id": 126
      },
      {
        "direction": "w",
        "id": 155
      }
    ]
  },
  {
    "id": 155,
    "description": "The roads from the East heads North West",
    "move": [
      {
        "direction": "e",
        "id": 154
      },
      {
        "direction": "nw",
        "id": 165
      }
    ]
  },
  {
    "id": 156,
    "description": "A small chamber in the mountain with some alcoves in the walls",
    "move": [
      {
        "direction": "nw",
        "id": 164
      },
      {
        "direction": "w",
        "id": 157
      }
    ]
  },
  {
    "id": 157,
    "description": "The tunnel leads from East to West",
    "move": [
      {
        "direction": "e",
        "id": 156
      },
      {
        "direction": "w",
        "id": 158
      }
    ]
  },
  {
    "id": 158,
    "description": "The tunnel leads from East to West",
    "move": [
      {
        "direction": "w",
        "id": 159
      },
      {
        "direction": "e",
        "id": 157
      }
    ]
  },
  {
    "id": 159,
    "description": "A large underground cavern with several tunnels. North West, North East, East, South and West",
    "move": [
      {
        "direction": "s",
        "id": 122
      },
      {
        "direction": "ne",
        "id": 163
      },
      {
        "direction": "nw",
        "id": 161
      },
      {
        "direction": "w",
        "id": 160
      },
      {
        "direction": "e",
        "id": 158
      }
    ]
  },
  {
    "id": 160,
    "description": "A small cavern with light filtering from above. The only way out is East",
    "move": [
      {
        "direction": "e",
        "id": 159
      }
    ]
  },
  {
    "id": 161,
    "description": "A junctions of tunnels. North, North East, East or South East",
    "move": [
      {
        "direction": "ne",
        "id": 199
      },
      {
        "direction": "n",
        "id": 200
      },
      {
        "direction": "se",
        "id": 159
      },
      {
        "direction": "e",
        "id": 162
      }
    ]
  },
  {
    "id": 162,
    "description": "The tunnel leads from East to West",
    "move": [
      {
        "direction": "e",
        "id": 163
      },
      {
        "direction": "w",
        "id": 161
      }
    ]
  },
  {
    "id": 163,
    "description": "A junctions of tunnels. North, North West, West or South West",
    "move": [
      {
        "direction": "nw",
        "id": 199
      },
      {
        "direction": "n",
        "id": 198
      },
      {
        "direction": "sw",
        "id": 159
      },
      {
        "direction": "w",
        "id": 162
      }
    ]
  },
  {
    "id": 164,
    "description": "The tunnel leads from South East to North West",
    "move": [
      {
        "direction": "nw",
        "id": 198
      },
      {
        "direction": "se",
        "id": 156
      }
    ]
  },
  {
    "id": 165,
    "description": "The road from the South East heads North West towards the mountain",
    "move": [
      {
        "direction": "se",
        "id": 155
      },
      {
        "direction": "nw",
        "id": 197
      }
    ]
  },
  {
    "id": 166,
    "description": "A small side cavern under the mountain. The exit is East",
    "move": [
      {
        "direction": "e",
        "id": 167
      }
    ]
  },
  {
    "id": 167,
    "description": "The descending tunnel turns North, and a small side tunnel goes West. The exit is East",
    "move": [
      {
        "direction": "e",
        "id": 168
      },
      {
        "direction": "w",
        "id": 166
      },
      {
        "direction": "n",
        "id": 194
      }
    ]
  },
  {
    "id": 168,
    "description": "The cave entrance quickly gets darker, and heads West down into the earth. The exit is South",
    "move": [
      {
        "direction": "s",
        "id": 153
      },
      {
        "direction": "w",
        "id": 167
      }
    ]
  },
  {
    "id": 169,
    "description": "An exposed path high in the rocks. A trail leads North West into a cave mouth, or East around the side of the mountain",
    "move": [
      {
        "direction": "e",
        "id": 170
      },
      {
        "direction": "nw",
        "id": 193
      }
    ]
  },
  {
    "id": 170,
    "description": "The narrow trail clings to the side of the mountain. North or West",
    "move": [
      {
        "direction": "n",
        "id": 191
      },
      {
        "direction": "w",
        "id": 169
      }
    ]
  },
  {
    "id": 171,
    "description": "A small cave. There are no tunnels and the only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 190
      }
    ]
  },
  {
    "id": 172,
    "description": "The road leads East or South",
    "move": [
      {
        "direction": "e",
        "id": 173
      },
      {
        "direction": "s",
        "id": 149
      }
    ]
  },
  {
    "id": 173,
    "description": "The road forks, leading North, East, West or North West",
    "move": [
      {
        "direction": "e",
        "id": 174
      },
      {
        "direction": "w",
        "id": 172
      },
      {
        "direction": "nw",
        "id": 189
      },
      {
        "direction": "n",
        "id": 188
      }
    ]
  },
  {
    "id": 174,
    "description": "The road travels East to West through the forest",
    "move": [
      {
        "direction": "e",
        "id": 175
      },
      {
        "direction": "w",
        "id": 173
      }
    ]
  },
  {
    "id": 175,
    "description": "The road forks, leading East, West or South West. Trails lead North to the castle wall or South into some trees",
    "move": [
      {
        "direction": "n",
        "id": 186
      },
      {
        "direction": "sw",
        "id": 147
      },
      {
        "direction": "w",
        "id": 174
      },
      {
        "direction": "s",
        "id": 146
      },
      {
        "direction": "e",
        "id": 176
      }
    ]
  },
  {
    "id": 176,
    "description": "The road forks, leading East, West or South East",
    "move": [
      {
        "direction": "se",
        "id": 144
      },
      {
        "direction": "e",
        "id": 177
      },
      {
        "direction": "w",
        "id": 175
      }
    ]
  },
  {
    "id": 177,
    "description": "The road goes North to the castle gates, or West to the forest. A trail goes North East to the castle wall",
    "move": [
      {
        "direction": "n",
        "id": 184
      },
      {
        "direction": "w",
        "id": 176
      },
      {
        "direction": "ne",
        "id": 183
      }
    ]
  },
  {
    "id": 178,
    "description": "Deep in the forest. The trail ends here, and the only exit is East",
    "move": [
      {
        "direction": "e",
        "id": 179
      }
    ]
  },
  {
    "id": 179,
    "description": "Deep in the forest. Trails lead North West, West or East",
    "move": [
      {
        "direction": "nw",
        "id": 183
      },
      {
        "direction": "e",
        "id": 180
      },
      {
        "direction": "w",
        "id": 178
      }
    ]
  },
  {
    "id": 180,
    "description": "Deep in the forest. Trails lead North or West",
    "move": [
      {
        "direction": "n",
        "id": 181
      },
      {
        "direction": "w",
        "id": 179
      }
    ]
  },
  {
    "id": 181,
    "description": "Next to the castle wall. The trail goes West along the wall or South into the forest. There is a tiny wooden door in the wall hidden behind the bushes",
    "move": [
      {
        "direction": "w",
        "id": 182
      },
      {
        "direction": "s",
        "id": 180
      },
      {
        "direction": "n",
        "id": 220
      }
    ]
  },
  {
    "id": 182,
    "description": "Next to the castle wall. The trail goes East or West along the wall",
    "move": [
      {
        "direction": "w",
        "id": 183
      },
      {
        "direction": "e",
        "id": 181
      }
    ]
  },
  {
    "id": 183,
    "description": "Next to the castle wall. The trail goes South West to the road, or along the wall to the East. Another trail heads South East into the forest",
    "move": [
      {
        "direction": "sw",
        "id": 177
      },
      {
        "direction": "se",
        "id": 179
      },
      {
        "direction": "e",
        "id": 182
      }
    ]
  },
  {
    "id": 184,
    "description": "In front of the castle gates. North into the castle, or South along the road. A path leads West along the wall",
    "move": [
      {
        "direction": "s",
        "id": 177
      },
      {
        "direction": "w",
        "id": 185
      },
      {
        "direction": "n",
        "id": 217
      }
    ]
  },
  {
    "id": 185,
    "description": "A path leading East to West along the castle wall",
    "move": [
      {
        "direction": "e",
        "id": 184
      },
      {
        "direction": "w",
        "id": 186
      }
    ]
  },
  {
    "id": 186,
    "description": "A path leading East to West along the castle wall. A trail leads South into the trees",
    "move": [
      {
        "direction": "e",
        "id": 185
      },
      {
        "direction": "s",
        "id": 175
      },
      {
        "direction": "w",
        "id": 187
      }
    ]
  },
  {
    "id": 187,
    "description": "A path leading East to West along the castle wall",
    "move": [
      {
        "direction": "e",
        "id": 186
      },
      {
        "direction": "w",
        "id": 188
      }
    ]
  },
  {
    "id": 188,
    "description": "A path leads East along the castle wall, or South to the road",
    "move": [
      {
        "direction": "e",
        "id": 187
      },
      {
        "direction": "s",
        "id": 173
      }
    ]
  },
  {
    "id": 189,
    "description": "The road forks, leading North West, West or South East",
    "move": [
      {
        "direction": "se",
        "id": 173
      },
      {
        "direction": "w",
        "id": 190
      },
      {
        "direction": "nw",
        "id": 211
      }
    ]
  },
  {
    "id": 190,
    "description": "The road goes from East to West. A small cave lies to the South",
    "move": [
      {
        "direction": "e",
        "id": 189
      },
      {
        "direction": "w",
        "id": 191
      },
      {
        "direction": "s",
        "id": 171
      }
    ]
  },
  {
    "id": 191,
    "description": "The road goes North or East. There is a narrow trail South leading up into the mountain",
    "move": [
      {
        "direction": "e",
        "id": 190
      },
      {
        "direction": "n",
        "id": 210
      },
      {
        "direction": "s",
        "id": 170
      }
    ]
  },
  {
    "id": 192,
    "description": "A large underground chamber on the edge of a pit. The only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 209
      }
    ]
  },
  {
    "id": 193,
    "description": "The cave mouth becomes a tunnel leading North into the mountain. The exit is South East",
    "move": [
      {
        "direction": "se",
        "id": 169
      },
      {
        "direction": "n",
        "id": 208
      }
    ]
  },
  {
    "id": 194,
    "description": "The deep tunnel leads West or South",
    "move": [
      {
        "direction": "s",
        "id": 167
      },
      {
        "direction": "w",
        "id": 195
      }
    ]
  },
  {
    "id": 195,
    "description": "There are tunnels East, West and North East",
    "move": [
      {
        "direction": "e",
        "id": 194
      },
      {
        "direction": "ne",
        "id": 207
      },
      {
        "direction": "w",
        "id": 196
      }
    ]
  },
  {
    "id": 196,
    "description": "The tunnel turns a corner. North or East",
    "move": [
      {
        "direction": "e",
        "id": 195
      },
      {
        "direction": "n",
        "id": 205
      }
    ]
  },
  {
    "id": 197,
    "description": "There is a massive cavern entering the depths of the mountain to the North. The road leads South East",
    "move": [
      {
        "direction": "se",
        "id": 165
      },
      {
        "direction": "n",
        "id": 204
      }
    ]
  },
  {
    "id": 198,
    "description": "The tunnel goes around a sharp bend. South East or South",
    "move": [
      {
        "direction": "s",
        "id": 163
      },
      {
        "direction": "se",
        "id": 164
      }
    ]
  },
  {
    "id": 199,
    "description": "A large underground chamber with exits North West, North East, South East and South West. It is warmest towards the North West",
    "move": [
      {
        "direction": "ne",
        "id": 203
      },
      {
        "direction": "nw",
        "id": 201
      },
      {
        "direction": "sw",
        "id": 161
      },
      {
        "direction": "se",
        "id": 163
      }
    ]
  },
  {
    "id": 200,
    "description": "A small cavern with light filtering from above. The only way out is South",
    "move": [
      {
        "direction": "s",
        "id": 161
      }
    ]
  },
  {
    "id": 201,
    "description": "The tunnel North gets warmer. Another tunnel leads South East",
    "move": [
      {
        "direction": "se",
        "id": 199
      },
      {
        "direction": "n",
        "id": 240
      }
    ]
  },
  {
    "id": 202,
    "description": "The Fire Dragon's Lair. The only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 239
      }
    ]
  },
  {
    "id": 203,
    "description": "Tunnels lead East or South West",
    "move": [
      {
        "direction": "e",
        "id": 204
      },
      {
        "direction": "sw",
        "id": 199
      }
    ]
  },
  {
    "id": 204,
    "description": "An intersection deep in the mountain. It is warmest towards the North. Tunnels lead North, West, East and South to the exit",
    "move": [
      {
        "direction": "s",
        "id": 197
      },
      {
        "direction": "e",
        "id": 205
      },
      {
        "direction": "n",
        "id": 237
      },
      {
        "direction": "w",
        "id": 203
      }
    ]
  },
  {
    "id": 205,
    "description": "A medium chamber with exits North East, South and West",
    "move": [
      {
        "direction": "s",
        "id": 196
      },
      {
        "direction": "w",
        "id": 204
      },
      {
        "direction": "ne",
        "id": 235
      }
    ]
  },
  {
    "id": 206,
    "description": "A small chamber lit orange by the glow from a lava pit. The only exit is North",
    "move": [
      {
        "direction": "n",
        "id": 235
      }
    ]
  },
  {
    "id": 207,
    "description": "This tunnel runs from South West to the North",
    "move": [
      {
        "direction": "sw",
        "id": 195
      },
      {
        "direction": "n",
        "id": 234
      }
    ]
  },
  {
    "id": 208,
    "description": "The North to South tunnel has a side tunnel leading East",
    "move": [
      {
        "direction": "s",
        "id": 193
      },
      {
        "direction": "e",
        "id": 209
      },
      {
        "direction": "n",
        "id": 233
      }
    ]
  },
  {
    "id": 209,
    "description": "The tunnel from the West turns South",
    "move": [
      {
        "direction": "w",
        "id": 208
      },
      {
        "direction": "s",
        "id": 192
      }
    ]
  },
  {
    "id": 210,
    "description": "The road goes East towards the castle, or South into the foot hills",
    "move": [
      {
        "direction": "s",
        "id": 191
      },
      {
        "direction": "e",
        "id": 211
      }
    ]
  },
  {
    "id": 211,
    "description": "At a crossroads. Roads lead North West, North East, South East and West",
    "move": [
      {
        "direction": "se",
        "id": 189
      },
      {
        "direction": "ne",
        "id": 229
      },
      {
        "direction": "nw",
        "id": 231
      },
      {
        "direction": "w",
        "id": 210
      }
    ]
  },
  {
    "id": 212,
    "description": "A secret tunnel heads East towards the castle, or north through a small hidden doorway",
    "move": [
      {
        "direction": "e",
        "id": 213
      },
      {
        "direction": "n",
        "id": 229
      }
    ]
  },
  {
    "id": 213,
    "description": "A secret tunnel under the castle wall heads North or West",
    "move": [
      {
        "direction": "n",
        "id": 228
      },
      {
        "direction": "w",
        "id": 212
      }
    ]
  },
  {
    "id": 214,
    "description": "The kings bedroom. Doors lead North and East",
    "move": [
      {
        "direction": "e",
        "id": 215
      },
      {
        "direction": "n",
        "id": 227
      }
    ]
  },
  {
    "id": 215,
    "description": "A back room in the castle. There are doors to the East and West",
    "move": [
      {
        "direction": "w",
        "id": 214
      },
      {
        "direction": "e",
        "id": 216
      }
    ]
  },
  {
    "id": 216,
    "description": "A function room in the castle. The main entrance is East, or deeper into the castle to the North and West",
    "move": [
      {
        "direction": "w",
        "id": 215
      },
      {
        "direction": "e",
        "id": 217
      },
      {
        "direction": "n",
        "id": 225
      }
    ]
  },
  {
    "id": 217,
    "description": "The grand castle atrium. The main gates are South, and the throne room is North. Doors lead East or West to other rooms.",
    "move": [
      {
        "direction": "s",
        "id": 184
      },
      {
        "direction": "n",
        "id": 224
      },
      {
        "direction": "w",
        "id": 216
      },
      {
        "direction": "e",
        "id": 218
      }
    ]
  },
  {
    "id": 218,
    "description": "A function room in the castle. The main entrance is West, or deeper into the castle to the East",
    "move": [
      {
        "direction": "w",
        "id": 217
      },
      {
        "direction": "e",
        "id": 219
      }
    ]
  },
  {
    "id": 219,
    "description": "The castle dining room. There are doors leading North, East or West",
    "move": [
      {
        "direction": "w",
        "id": 218
      },
      {
        "direction": "e",
        "id": 220
      },
      {
        "direction": "n",
        "id": 222
      }
    ]
  },
  {
    "id": 220,
    "description": "A back room in the castle. There is a door in the West wall. A painting hides a tiny door in the South wall",
    "move": [
      {
        "direction": "s",
        "id": 181
      },
      {
        "direction": "w",
        "id": 219
      }
    ]
  },
  {
    "id": 221,
    "description": "The castle store room. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 222
      }
    ]
  },
  {
    "id": 222,
    "description": "The castle kitchens. There are doors leading East, West or South",
    "move": [
      {
        "direction": "e",
        "id": 221
      },
      {
        "direction": "w",
        "id": 223
      },
      {
        "direction": "s",
        "id": 219
      }
    ]
  },
  {
    "id": 223,
    "description": "The king's private study. West to the throne room, or East to the kitchens",
    "move": [
      {
        "direction": "e",
        "id": 222
      },
      {
        "direction": "w",
        "id": 224
      }
    ]
  },
  {
    "id": 224,
    "description": "The castle throne room. The main entrance is South, and a back exit leads East",
    "move": [
      {
        "direction": "s",
        "id": 217
      },
      {
        "direction": "e",
        "id": 223
      }
    ]
  },
  {
    "id": 225,
    "description": "This is a welcome area for the ballroom to the West. Another door leads South",
    "move": [
      {
        "direction": "w",
        "id": 226
      },
      {
        "direction": "s",
        "id": 216
      }
    ]
  },
  {
    "id": 226,
    "description": "The castle grand ballroom. Exits are East and West",
    "move": [
      {
        "direction": "w",
        "id": 227
      },
      {
        "direction": "e",
        "id": 225
      }
    ]
  },
  {
    "id": 227,
    "description": "A private function room next to the ballroom to the East. A door leads South. A hidden trap door reveals steps leading down and West",
    "move": [
      {
        "direction": "w",
        "id": 228
      },
      {
        "direction": "s",
        "id": 214
      },
      {
        "direction": "e",
        "id": 226
      }
    ]
  },
  {
    "id": 228,
    "description": "A secret tunnel under the castle wall heads South, or up some stairs East into the castle",
    "move": [
      {
        "direction": "e",
        "id": 227
      },
      {
        "direction": "s",
        "id": 213
      }
    ]
  },
  {
    "id": 229,
    "description": "A small copse of trees. The road is South West. A trail leads West. To the South is a small hidden building with a door.",
    "move": [
      {
        "direction": "sw",
        "id": 211
      },
      {
        "direction": "w",
        "id": 230
      },
      {
        "direction": "s",
        "id": 212
      }
    ]
  },
  {
    "id": 230,
    "description": "The trail leads East towards a small copse of trees, or West out into the open",
    "move": [
      {
        "direction": "e",
        "id": 229
      },
      {
        "direction": "w",
        "id": 231
      }
    ]
  },
  {
    "id": 231,
    "description": "The road from the South East ends here. A trail leads East",
    "move": [
      {
        "direction": "e",
        "id": 230
      },
      {
        "direction": "se",
        "id": 211
      }
    ]
  },
  {
    "id": 232,
    "description": "A small and dark underground chamber. The only exit it West",
    "move": [
      {
        "direction": "w",
        "id": 233
      }
    ]
  },
  {
    "id": 233,
    "description": "This tunnel heads West or South. there is a small side tunnel to the East",
    "move": [
      {
        "direction": "e",
        "id": 232
      },
      {
        "direction": "w",
        "id": 234
      },
      {
        "direction": "s",
        "id": 208
      }
    ]
  },
  {
    "id": 234,
    "description": "A junction of tunnels. East, West or South",
    "move": [
      {
        "direction": "s",
        "id": 207
      },
      {
        "direction": "e",
        "id": 233
      },
      {
        "direction": "w",
        "id": 235
      }
    ]
  },
  {
    "id": 235,
    "description": "The main tunnel leads East or South West, and there is an entrance to a chamber to the South",
    "move": [
      {
        "direction": "e",
        "id": 234
      },
      {
        "direction": "s",
        "id": 206
      },
      {
        "direction": "sw",
        "id": 205
      }
    ]
  },
  {
    "id": 236,
    "description": "A chamber under the mountain. The only exit is West",
    "move": [
      {
        "direction": "w",
        "id": 237
      }
    ]
  },
  {
    "id": 237,
    "description": "It seems warmer along the tunnel West, with other tunnels lead South and East",
    "move": [
      {
        "direction": "s",
        "id": 204
      },
      {
        "direction": "e",
        "id": 236
      },
      {
        "direction": "w",
        "id": 238
      }
    ]
  },
  {
    "id": 238,
    "description": "The East to West tunnel gets much warmer as you move West",
    "move": [
      {
        "direction": "e",
        "id": 237
      },
      {
        "direction": "w",
        "id": 239
      }
    ]
  },
  {
    "id": 239,
    "description": "The East to West tunnel has a large side tunnel South that is belching out heat and has an orange glow",
    "move": [
      {
        "direction": "w",
        "id": 240
      },
      {
        "direction": "e",
        "id": 238
      },
      {
        "direction": "s",
        "id": 202
      }
    ]
  },
  {
    "id": 240,
    "description": "The tunnel East gets much warmer, or else cooler towards the South",
    "move": [
      {
        "direction": "s",
        "id": 201
      },
      {
        "direction": "e",
        "id": 239
      }
    ]
  }
];
