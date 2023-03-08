import { VarNode } from "./AD"

function f() {
    const x = new VarNode(2)
    const y  = new VarNode(3)
    // x*x*4+y*x*2 +3
    // x grad = 8+6 = 14
    // y grad = 4
    // 16+12+3
    // = 31
    // const output =   x.times(x).times(4)
    const output =   x.times(x).times(4).add(y.times(x).times(2)).add(3)

    return  {
        input:[x,y],
        output
    }
}

const {input,output:z}  = f()

const res = z.forward(new Map(),new Map())
res.grad=1
res.backward()
console.log(z.toString(),res, input)