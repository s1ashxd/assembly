# UVM Assembler and Interpreter

## Общее описание
Проект реализует ассемблер и интерпретатор для УВМ. Поддерживает все команды: load_const, read_mem, write_mem, popcnt.

## Описание функций и настроек
- Парсит ASM в бинарный код.
- Выполняет бинарный код, создает дамп памяти в XML.
- Унифицированная память объемом 1MB байт.
- Количество регистров 0-63, значение 32-bit unsigned.

## Сборка и использование
Обязательна предустановка Node v24.9.0
```bash
npm install
npx tsc
node dist/assembler.js -i prog.asm -o prog.bin -t
node dist/interpreter.js -i prog.bin -d dump.xml -r 0-100
```

## Язык ассемблера
- load_const <const>, <reg>
- read_mem <mem_addr>, <reg>
- write_mem <reg>, <mem_addr>
- popcnt <offset_b>, <offset_c>, <reg_d>, <reg_e>
### Пример
```asm
load_const 20, r10
load_const 24, r11
load_const 1000, r12
load_const 1001, r13

write_mem r12, 100
write_mem r13, 104

popcnt 80, 80, r10, r11
```