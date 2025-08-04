
export interface Child {
  id: number;
  name: string;
  age: number;
  parentName: string;
  phoneNumber: string;
  game: string;
  checkInTime: number;
}

export interface CompletedSession extends Child {
    checkOutTime: number;
    durationMs: number;
    cost: number;
}
