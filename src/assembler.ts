import * as fs from 'fs';
import { Command } from 'commander';
import { IR } from './types';

const program = new Command();

program
    .option('-i, --input <file>', 'Path to input ASM file')
    .option('-o, --output <file>', 'Path to output binary file')
    .option('-t, --test', 'Test mode');
program.parse(process.argv);

const options = program.opts();

if (!options.input) {
    console.error('Input file required');
    process.exit(1);
}

function parseReg(str: string): number {
    if (str.startsWith('r')) {
        return parseInt(str.slice(1), 10);
    }
    return parseInt(str, 10);
}

function parseNumber(str: string): number {
    if (str.startsWith('0x')) {
        return parseInt(str, 16);
    }
    return parseInt(str, 10);
}

function parseAsm(file: string): IR[] {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const ir: IR[] = [];
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//') || line.startsWith(';')) continue;
        const parts = line.split(/\s*,\s*|\s+/);
        const mnemonic = parts[0].toLowerCase();
        if (mnemonic === 'load_const') {
            const const_val = parseNumber(parts[1]);
            const reg = parseReg(parts[2]);
            if (reg < 0 || reg > 63) throw new Error('Invalid reg');
            if (const_val < 0 || const_val >= (1 << 29)) throw new Error('Invalid const');
            ir.push({ type: 'load_const', const_val, reg });
        } else if (mnemonic === 'read_mem') {
            const mem_addr = parseNumber(parts[1]);
            const reg = parseReg(parts[2]);
            if (mem_addr < 0 || mem_addr >= (1 << 17)) throw new Error('Invalid addr');
            if (reg < 0 || reg > 63) throw new Error('Invalid reg');
            ir.push({ type: 'read_mem', mem_addr, reg });
        } else if (mnemonic === 'write_mem') {
            const reg = parseReg(parts[1]);
            const mem_addr = parseNumber(parts[2]);
            if (reg < 0 || reg > 63) throw new Error('Invalid reg');
            if (mem_addr < 0 || mem_addr >= (1 << 17)) throw new Error('Invalid addr');
            ir.push({ type: 'write_mem', reg, mem_addr });
        } else if (mnemonic === 'popcnt') {
            const offset_b = parseNumber(parts[1]);
            const offset_c = parseNumber(parts[2]);
            const reg_d = parseReg(parts[3]);
            const reg_e = parseReg(parts[4]);
            if (offset_b < 0 || offset_b >= 128) throw new Error('Invalid offset_b');
            if (offset_c < 0 || offset_c >= 128) throw new Error('Invalid offset_c');
            if (reg_d < 0 || reg_d > 63) throw new Error('Invalid reg_d');
            if (reg_e < 0 || reg_e > 63) throw new Error('Invalid reg_e');
            ir.push({ type: 'popcnt', offset_b, offset_c, reg_d, reg_e });
        } else {
            throw new Error(`Unknown mnemonic: ${mnemonic}`);
        }
    }
    return ir;
}

function printIR(ir: IR[]) {
    for (const instr of ir) {
        if (instr.type === 'load_const') {
            console.log(`A=3, B=${instr.const_val}, C=${instr.reg}`);
        } else if (instr.type === 'read_mem') {
            console.log(`A=5, B=${instr.mem_addr}, C=${instr.reg}`);
        } else if (instr.type === 'write_mem') {
            console.log(`A=6, B=${instr.reg}, C=${instr.mem_addr}`);
        } else if (instr.type === 'popcnt') {
            console.log(`A=2, B=${instr.offset_b}, C=${instr.offset_c}, D=${instr.reg_d}, E=${instr.reg_e}`);
        }
    }
}

function packInstr(instr: IR): Buffer {
    if (instr.type === 'load_const') {
        let bits = 0n;
        bits |= 3n;
        bits |= BigInt(instr.const_val) << 3n;
        bits |= BigInt(instr.reg) << 32n;
        const buf = Buffer.alloc(5);
        for (let i = 0; i < 5; i++) {
            buf[i] = Number((bits >> BigInt(i * 8)) & 255n);
        }
        return buf;
    } else if (instr.type === 'read_mem') {
        let bits = 0n;
        bits |= 5n;
        bits |= BigInt(instr.mem_addr) << 3n;
        bits |= BigInt(instr.reg) << 20n;
        const buf = Buffer.alloc(4);
        for (let i = 0; i < 4; i++) {
            buf[i] = Number((bits >> BigInt(i * 8)) & 255n);
        }
        return buf;
    } else if (instr.type === 'write_mem') {
        let bits = 0n;
        bits |= 6n;
        bits |= BigInt(instr.reg) << 3n;
        bits |= BigInt(instr.mem_addr) << 9n;
        const buf = Buffer.alloc(4);
        for (let i = 0; i < 4; i++) {
            buf[i] = Number((bits >> BigInt(i * 8)) & 255n);
        }
        return buf;
    } else if (instr.type === 'popcnt') {
        let bits = 0n;
        bits |= 2n;
        bits |= BigInt(instr.offset_b) << 3n;
        bits |= BigInt(instr.offset_c) << 10n;
        bits |= BigInt(instr.reg_d) << 17n;
        bits |= BigInt(instr.reg_e) << 23n;
        const buf = Buffer.alloc(4);
        for (let i = 0; i < 4; i++) {
            buf[i] = Number((bits >> BigInt(i * 8)) & 255n);
        }
        return buf;
    }
    throw new Error('Unknown instr type');
}

function printBytes(buf: Buffer) {
    const hex = Array.from(buf).map(b => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
    console.log(hex);
}

const ir = parseAsm(options.input);

if (options.test) {
    printIR(ir);
    console.log('Assembled commands:', ir.length);
    for (const instr of ir) {
        const buf = packInstr(instr);
        printBytes(buf);
    }
} else if (options.output) {
    const buffers = ir.map(packInstr);
    const binary = Buffer.concat(buffers);
    fs.writeFileSync(options.output, binary);
    console.log('Assembled commands:', ir.length);
}