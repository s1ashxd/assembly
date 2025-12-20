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
Дамп памяти:
```xml
<memory>
  <cell address="0" value="163" />
  <cell address="4" value="49930" />
  <cell address="8" value="524487424" />
  <cell address="12" value="1259077632" />
  <cell address="16" value="218103839" />
  <cell address="20" value="51302" />
  <cell address="24" value="53358" />
  <cell address="28" value="93667970" />
  ...
  <cell address="100" value="1000" />
  <cell address="104" value="1000" />
</memory>
```
