export class ADNode {
  constructor() {}

  add(_value: ADNode | number) {
    const value = typeof _value === "number" ? new VarNode(_value) : _value;
    return new OPNode([this, value], OP.add);
  }

  times(_value: ADNode | number) {
    const value = typeof _value === "number" ? new VarNode(_value) : _value;
    return new OPNode([this, value], OP.times);
  }

  forward(depMap: Map<OPForward, Set<OPForward>>,forwardMap:Map<ADNode, Forward>) {
    let f = forwardMap.get(this)
    if (!f) {
        forwardMap.set(this,f = new Forward(this, depMap,forwardMap))
    }
    return f;
  }

  toString() {
    return "";
  }
}

export class VarNode extends ADNode {
  constructor(public value: number, readonly requireGrad = true) {
    super();
  }

  add(_value: ADNode | number) {
    const value =
      typeof _value === "number" ? new VarNode(_value, false) : _value;
    return new OPNode([this, value], OP.add);
  }

  times(_value: ADNode | number) {
    const value =
      typeof _value === "number" ? new VarNode(_value, false) : _value;
    return new OPNode([this, value], OP.times);
  }

  forward(depMap: Map<OPForward, Set<OPForward>>,forwardMap:Map<ADNode, Forward>) {
    let f = forwardMap.get(this)
    if (!f) {
        forwardMap.set(this,f = new VarForward(this, depMap,forwardMap))
    }
    return f;
  }

  toString() {
    return `${this.value}`;
  }
}

export enum OP {
  add = "add",
  times = "times",
}

export class OPNode extends ADNode {
  constructor(readonly input: [ADNode, ADNode], public op: OP) {
    super();
  }

  forward(depMap: Map<OPForward, Set<OPForward>>,forwardMap:Map<ADNode, OPForward>) {
    let f = forwardMap.get(this)
    if (!f) {
        forwardMap.set(this,f = new OPForward(this, depMap,forwardMap))
    }
    return f;
  }

  toString() {
    let char = "";
    switch (this.op) {
      case OP.add:
        char = "+";
        break;

      case OP.times:
        char = "*";
        break;

      default:
        break;
    }
    return `(${this.input[0].toString()} ${char} ${this.input[1].toString()})`;
  }
}

class Forward {
  constructor(public adNode: ADNode,public depMap: Map<OPForward, Set<OPForward>>, public forwardMap:Map<ADNode, Forward>) {}
  value = 0;
  grad = 0;
}

class OPForward extends Forward {
  constructor(
    public adNode: OPNode,
    public depMap: Map<OPForward, Set<OPForward>>,
    public forwardMap:Map<ADNode, Forward>
  ) {
    super(adNode, depMap,forwardMap);
    this.calcValue();
  }

  input: Forward[] = [
    this.adNode.input[0].forward(this.depMap,this.forwardMap),
    this.adNode.input[1].forward(this.depMap,this.forwardMap),
  ];

  value = 0;

  calcValue() {
    let value = 0;
    switch (this.adNode.op) {
      case OP.add:
        this.value = this.input[0].value + this.input[1].value;
        break;
      case OP.times:
        this.value = this.input[0].value * this.input[1].value;
        break;

      default:
        throw new Error("未定义的 op");
        break;
    }

    return value;
  }

  backward() {
    switch (this.adNode.op) {
      case OP.add:
        this.input[0].grad += 1 * this.grad;
        this.input[1].grad += 1 * this.grad;
        break;
      case OP.times:
        this.input[0].grad += this.input[1].value * this.grad;
        this.input[1].grad += this.input[0].value * this.grad;
        break;

      default:
        throw new Error("未定义的 op");
        break;
    }

    this.input.forEach((item) => {
      if (item instanceof OPForward) {
        item.backward();
      }
    });
  }
}

class VarForward extends Forward {
  constructor(public adNode: VarNode, depMap: Map<OPForward, Set<OPForward>>,public forwardMap:Map<ADNode, Forward>) {
    super(adNode, depMap,forwardMap);
  }

  value = this.adNode.value;
}
