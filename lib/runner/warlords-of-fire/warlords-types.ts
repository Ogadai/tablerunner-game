import { StorePlayerInstructions } from "@/lib/store/types";

export interface WarlordInstructionRecruit {
  recruitId?: number;
  monster: string;
}

export interface WarlordInstruction extends StorePlayerInstructions {
  recruit: WarlordInstructionRecruit[];
}
