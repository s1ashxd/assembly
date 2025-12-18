import * as fs from 'fs';
import { Command } from 'commander';
import { IR } from './types';

const program = new Command();

program
    .option('-i, --input <file>', 'Path to input binary file')
    .option('-d, --dump <file>', 'Path to dump file')
    .option('-r, --range <start-end>', 'Memory dump range');
program.parse(process.argv);

const options = program.opts();

if (!options.input) {
    console.error('Input binary file required');
    process.exit(1);
}

const MEMORY_SIZE = 1 << 20;

function decode(buf: Buffer): IR {
    let bits = 0n;
    for (let i = 0; i < buf.length; i++) {
        bits |= BigInt(buf[i]) << BigInt(i * 8);
    }
    const opcode = Number(bits & 7n);
    if (opcode === 3) {
        const const_val = Number((bits >> 3n) & ((1n << 29n) - 1n));
        const reg = Number((bits >> 32n) & 63n);
        return { type: 'load_const', const_val, reg };
    } else if (opcode === 5) {
        const mem_addr = Number((bits >> 3n) & ((1n << 17n) - 1n));
        const reg = Number((bits >> 20n) & 63n);
        return { type: 'read_mem', mem_addr, reg };
    } else if (opcode === 6) {
        const reg = Number((bits >> 3n) & 63n);
        const mem_addr = Number((bits >> 9n) & ((1n << 17n) - 1n));
        return { type: 'write_mem', reg, mem_addr };
    } else if (opcode === 2) {
        const offset_b = Number((bits >> 3n) & 127n);
        const offset_c = Number((bits >> 10n) & 127n);
        const reg_d = Number((bits >> 17n) & 63n);
        const reg_e = Number((bits >> 23n) & 63n);
        return { type: 'popcnt', offset_b, offset_c, reg_d, reg_e };
    }

    throw new Error(`Unknown opcode: ${opcode}`);
}

function execute(ir: IR, registers: number[], memory: DataView) {
    if (ir.type === 'load_const') {
        registers[ir.reg] = ir.const_val >>> 0;
    } else if (ir.type === 'read_mem') {
        registers[ir.reg] = memory.getUint32(ir.mem_addr, true);
    } else if (ir.type === 'write_mem') {
        memory.setUint32(ir.mem_addr, registers[ir.reg], true);
    } else if (ir.type === 'popcnt') {
        const operand_addr = registers[ir.reg_d] + ir.offset_c;
        const value = memory.getUint32(operand_addr, true);
        const result_addr = registers[ir.reg_e] + ir.offset_b;
        memory.setUint32(result_addr, value, true);
    }
}

const code = fs.readFileSync(options.input);
const memoryBuffer = new ArrayBuffer(MEMORY_SIZE);
const memory = new DataView(memoryBuffer);

for (let i = 0; i < code.length; i++) {
    memory.setUint8(i, code[i]);
}

const registers: number[] = new Array(64).fill(0);
let pc = 0;
const codeSize = code.length;

while (pc < codeSize) {
    const opcode = memory.getUint8(pc) & 7;
    const size = (opcode === 3) ? 5 : 4;
    if (pc + size > codeSize) break;
    const instrBytes: number[] = [];
    for (let i = 0; i < size; i++) {
        instrBytes.push(memory.getUint8(pc + i));
    }
    const buf = Buffer.from(instrBytes);
    const ir = decode(buf);
    execute(ir, registers, memory);
    pc += size;
}

if (options.dump && options.range) {
    const [startStr, endStr] = options.range.split('-');
    const start = Number.parseInt(startStr);
    const end = Number.parseInt(endStr);
    let xml = '<memory>\n';
    for (let addr = start; addr <= end; addr += 4) {
        const val = memory.getUint32(addr, true);
        xml += `  <cell address="${addr}" value="${val}" />\n`;
    }
    xml += '</memory>';
    fs.writeFileSync(options.dump, xml);
}