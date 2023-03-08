export class CalcNode {
  constructor() {}

  add(_value: CalcNode | number): OPCalcNode {
    const value = typeof _value === "number" ? new VarCalcNode(_value) : _value;
    return new OPCalcNode([this, value], OP.add);
  }

  times(_value: CalcNode | number) {
    const value = typeof _value === "number" ? new VarCalcNode(_value) : _value;
    return new OPCalcNode([this, value], OP.times);
  }

  forward(
    manager: GradNodeManager = new GradNodeManager(),
    parentGradNode?: GradNode
  ) {
    let f = manager.forwardMap.get(this);
    if (!f) {
      manager.forwardMap.set(this, (f = this.createGradNode(manager)));
    }

    let s = manager.depMap.get(f);
    if (!s) {
      manager.depMap.set(f, (s = new Set()));
    }

    if (parentGradNode) {
      s.add(parentGradNode);
    }

    return f;
  }

  createGradNode(manager: GradNodeManager) {
    return new GradNode(this, manager);
  }

  toString() {
    return "";
  }
}

export class VarCalcNode extends CalcNode {
  constructor(public value: number, readonly requireGrad = true) {
    super();
  }

  label = "";

  add(_value: CalcNode | number): OPCalcNode {
    const value =
      typeof _value === "number" ? new VarCalcNode(_value, false) : _value;
    return new OPCalcNode([this, value], OP.add);
  }

  times(_value: CalcNode | number): OPCalcNode {
    const value =
      typeof _value === "number" ? new VarCalcNode(_value, false) : _value;
    return new OPCalcNode([this, value], OP.times);
  }

  createGradNode(manager: GradNodeManager) {
    return new VarGradNode(this, manager);
  }

  toString() {
    return `${
      this.requireGrad ? (this.label ? this.label : [this.value]) : this.value
    }`;
  }

  varDesc() {
    return `${this.toString()} = ${this.value}`;
  }
}

export enum OP {
  add = "add",
  times = "times",
}

export class OPCalcNode extends CalcNode {
  constructor(readonly input: [CalcNode, CalcNode], public op: OP) {
    super();
  }

  createGradNode(manager: GradNodeManager) {
    return new OPGradNode(this, manager);
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

class GradNode {
  constructor(public clcNode: CalcNode, public manager: GradNodeManager) {}
  value = 0;
  grad = 0;
  backward(isRoot = false) {}
}

enum EBackwardStatus {
  done = "done",
  doing = "doing",
  waiting = "waiting",
}

class OPGradNode extends GradNode {
  constructor(public clcNode: OPCalcNode, public manager: GradNodeManager) {
    super(clcNode, manager);
    this.calcValue();
  }

  input: GradNode[] = [
    this.clcNode.input[0].forward(this.manager, this),
    this.clcNode.input[1].forward(this.manager, this),
  ];

  value = 0;

  calcValue() {
    let value = 0;
    switch (this.clcNode.op) {
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

  #backward = EBackwardStatus.waiting;

  get isBackwarded() {
    return this.#backward === EBackwardStatus.done;
  }

  backward(isRoot = true) {
    if (isRoot) {
      this.grad = 1;
    }

    if (this.#backward === EBackwardStatus.done) {
      return;
    }
    if (this.#backward === EBackwardStatus.doing) {
      throw new Error("检测到循环依赖");
    }

    const dep = this.manager.depMap.get(this);
    if (dep) {
      const deps = [...dep];
      const depNeedBackwarded = deps.some((item) => {
        if (item instanceof OPGradNode) {
          return !item.isBackwarded;
        } else {
          throw new Error("应该只有 OPForward");
        }
      });

      if (depNeedBackwarded) {
        return;
      }
    }

    this.#backward = EBackwardStatus.doing;

    switch (this.clcNode.op) {
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

    this.#backward = EBackwardStatus.done;

    this.input.forEach((item) => {
      if (item instanceof OPGradNode) {
        item.backward(false);
      }
    });
  }
}

class VarGradNode extends GradNode {
  constructor(public clcNode: VarCalcNode, public manager: GradNodeManager) {
    super(clcNode, manager);
  }

  value = this.clcNode.value;
}

class GradNodeManager {
  constructor(
    public depMap: Map<GradNode, Set<GradNode>> = new Map(),
    public forwardMap: Map<CalcNode, GradNode> = new Map()
  ) {}
}
