export interface LoadConstIR {
    type: 'load_const';
    const_val: number;
    reg: number;
}

export interface ReadMemIR {
    type: 'read_mem';
    mem_addr: number;
    reg: number;
}

export interface WriteMemIR {
    type: 'write_mem';
    reg: number;
    mem_addr: number;
}

export interface PopcntIR {
    type: 'popcnt';
    offset_b: number;
    offset_c: number;
    reg_d: number;
    reg_e: number;
}

export type IR = LoadConstIR | ReadMemIR | WriteMemIR | PopcntIR;