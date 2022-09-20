import { TreeGraphData } from "@antv/g6/lib/types";

export interface ArgsOptional {
    name: string;
    value: string | number;
}

export interface ArgsDefType {
    name: string;
    type: string;
    desc: string;
    default: string;
    options: ArgsOptional[];
}
export interface BehaviorNodeTypeModel {
    name: string;
    type?: string;
    desc?: string;
    args?: ArgsDefType[];
    input?: string[];
    output?: string[];
    doc?: string;
}

export interface BehaviorNodeModel {
    id: number;
    name: string;
    desc?: string;
    args?: { [key: string]: any };
    input?: string[];
    output?: string[];
    children?: BehaviorNodeModel[];
    debug?: boolean;
    frameRecordInfo?: AIRecordInfo;
}

// ** 这里需要与 BBWGProject\assets\Scripts\GamePlay\AI\Behavior3\constants.ts:30 的定义对齐
export enum BevTreeExecuteStatus {
    ExecuteStatus_Failed = 0,
    ExecuteStatus_Finished = 1,
    ExecuteStatus_Executing = 2,
    ExecuteStatus_Break = 3,
    ExecuteStatus_Error = 4,
}
export interface AIRecordInfo {
    counter: number
    nodeId: number
    nodePath: string
    content: string
    state: BevTreeExecuteStatus
}

export class AIHotReloadInfo {
    nodeId: number
    nodeType: string
    args: any
}
// ** 上面的内容需要与 BBWGProject\assets\Scripts\GamePlay\AI\Behavior3\constants.ts:30 的定义对齐


export interface BehaviorTreeModel {
    name: string;
    desc?: string;
    root: BehaviorNodeModel;
}

export interface GraphNodeModel extends TreeGraphData {
    name: string;
    desc?: string;
    args?: { [key: string]: any };
    input?: string[];
    output?: string[];
    children?: GraphNodeModel[];
    conf: BehaviorNodeTypeModel;
    debug?: boolean;

    size?: number[];
}
