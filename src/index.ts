import { VarCalcNode } from "./AD";

function f() {
  const x = new VarCalcNode(2);
  const y = new VarCalcNode(3);

  const m = x.times(y).times(1);
  const output = m.times(m).add(4);

  x.label='x'
  y.label='y'

  return {
    input: [x, y],
    output,
  };
}

const { input, output: z } = f();

const res = z.forward();
res.backward();
console.log("calc", z.toString());
console.log("input", input.map(e=>e.varDesc()).join('; '));
console.log("grad", res);
