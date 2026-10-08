import { StorePlayerInstructions } from "@/lib/store/types";

export interface WarlordInstructionRecruit {
  monster: string;
}

export interface WarlordInstruction extends StorePlayerInstructions {
  recruit: WarlordInstructionRecruit[];
}
