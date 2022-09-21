import React from "react";
import {
    Card,
    Divider,
    Form,
    Input,
    AutoComplete,
    Select,
    Switch,
    InputNumber,
    notification,
} from "antd";
import { INode } from "@antv/g6/lib/interface/item";
import {
    BehaviorNodeModel,
    BehaviorNodeTypeModel,
    ArgsDefType,
    BevTreeExecuteStatus,
    BehaviorTreeModel,
    AIHotReloadInfo,
} from "../../common/BehaviorTreeModel";
import Settings from "../../main-process/Settings";
import { FormInstance } from "antd/lib/form";
import Markdown from "react-markdown";
import { InfoCircleOutlined } from "@ant-design/icons";
import { message } from 'antd';
import MainEventType from "../../common/MainEventType";
import { ipcRenderer } from "electron";

const { Item } = Form;
const { Option } = Select;

interface NodePanelProps {
    model: BehaviorNodeModel;
    treeModel: BehaviorTreeModel;
    settings: Settings;
    updateNode: (id: string, forceUpdate: boolean) => void;
    pushUndoStack: () => void;
}

interface NodePanelState {
    message: string,
    isMouseInForm: boolean
    inFormClassName: string
}

export default class NodePanel extends React.Component<NodePanelProps, NodePanelState> {
    formRef = React.createRef<FormInstance>();
    debugInfoRef = React.createRef<any>();
    state: NodePanelState = {
        inFormClassName: "",
        message: "无数据",
        isMouseInForm: false,
    };
    componentDidUpdate() {
        this.formRef.current.resetFields();
        this.formRef.current.setFieldsValue(this.getInitialValues());
    }

    getInitialValues() {
        const { model } = this.props;
        const initialValues: any = {
            name: model.name,
            desc: model.desc,
            debug: model.debug,
            customArgs: model.args ? JSON.stringify(model.args, null, " ") : "",
        };
        if (model.args) {
            for (let k in model.args) {
                initialValues[`args.${k}`] = model.args[k];
            }
        }
        if (model.input) {
            model.input.forEach((v, i) => {
                initialValues[`input.${i}`] = v;
            });
        }
        if (model.output) {
            model.output.forEach((v, i) => {
                initialValues[`output.${i}`] = v;
            });
        }
        return initialValues;
    }

    onFinish = (values: any) => {
        console.log("Success:", values);
        const { updateNode, pushUndoStack, model, settings, treeModel } = this.props;
        const conf = settings.getNodeConf(values.name);
        if (!conf) {
            notification.warn({ message: `节点${values.name}未定义` });
            return;
        }
        var args: any = {};
        if (values.customArgs) {
            try {
                args = JSON.parse(values.customArgs);
            } catch (e) {
                message.warn(`您输入的自定义参数不符合json格式${values.customArgs}`);
                return;
            }
        }

        pushUndoStack();

        var forceUpdate = false;
        if (model.name != values.name) {
            model.name = values.name;
            forceUpdate = true;
        }
        model.desc = values.desc;
        model.debug = values.debug;

        if (conf.args) {
            conf.args.forEach((e) => {
                const k = "args." + e.name;
                if (e.type.indexOf("number") > 0) {
                    args[e.name] = Number(values[k]);
                } else {
                    args[e.name] = values[k];
                }
            });
        }

        model.args = args;
        this.formRef.current.setFieldsValue({
            customArgs: model.args ? JSON.stringify(model.args, null, " ") : "",
        });

        if (conf.input) {
            model.input = [];
            conf.input.forEach((e, i) => {
                model.input.push(values["input." + i] || "");
            });
        } else {
            model.input = null;
        }

        if (conf.output) {
            model.output = [];
            conf.output.forEach((e, i) => {
                model.output.push(values["output." + i] || "");
            });
        } else {
            model.output = null;
        }

        if (forceUpdate) {
            this.forceUpdate();
        }
        updateNode(model.id.toString(), forceUpdate);
        let hotReloadInfo: AIHotReloadInfo = {
            // ** TODO：不知道为啥这个 model.id 是字符串类型的
            nodeId: Number(model.id),
            nodeType: model.name,
            args: args
        }
        ipcRenderer.send(`AI_PROP_CHANGED_${treeModel.name}`, hotReloadInfo);
    };

    onFinishFailed = (errorInfo: any) => {
        console.log("Failed:", errorInfo);
    };

    handleSubmit = (event: any) => {
        console.log("handleSubmit");
        this.formRef.current.submit();
    };

    render() {
        const { model, settings } = this.props;
        const conf = settings.getNodeConf(model.name);
        const title = conf.desc;

        const options: any = [];
        settings.nodeConfig.map((e) => {
            options.push({ label: `${e.name}(${e.desc})`, value: e.name });
        });

        const layout = {
            labelCol: { span: 6 },
            wrapperCol: { span: 18 },
        };
        return (
            <Card title={title} style={{ height: window.screen.height - 100, overflow: "auto" }}>
                <Form
                    {...layout}
                    name="basic"
                    onFinish={this.onFinish}
                    initialValues={this.getInitialValues()}
                    ref={this.formRef}
                    className={this.state.inFormClassName}
                    onMouseEnter={() => {
                        this.state.isMouseInForm = true
                        this.setState({
                            inFormClassName: "focusInForm"
                        })
                    }}
                    onMouseLeave={() => {
                        this.state.isMouseInForm = false
                        this.setState({
                            inFormClassName: ""
                        })
                    }}
                >
                    <Item label="节点id">
                        <Input value={model.id} disabled={true} />
                    </Item>
                    <Item label="节点名称" name="name">
                        <AutoComplete
                            disabled={true}
                            options={options}
                            onBlur={this.handleSubmit}
                            filterOption={(inputValue: string, option: any) => {
                                return (
                                    option.label.toUpperCase().indexOf(inputValue.toUpperCase()) !==
                                    -1
                                );
                            }}
                        />
                    </Item>
                    <Item label="节点说明" name="desc">
                        <Input onBlur={this.handleSubmit} />
                    </Item>
                    {/* <Item label="调试时显示节点状态改变" name="debug" valuePropName="checked">
                        <Switch onChange={this.handleSubmit} />
                    </Item> */}
                    <Markdown source={conf.doc} />
                    {this.renderInputs(conf)}
                    {this.renderArgs(conf)}
                    {this.renderOutputs(conf)}
                </Form>
                {this.renderDebug(conf)}
            </Card>
        );
    }
    refreshDebugInfo() {
        if (this.state.isMouseInForm) {
            if (this.state.message !== "等待数据修改，已停止刷新调试信息") {
                this.setState({ message: "等待数据修改，已停止刷新调试信息" })
            }
            return;
        }
        let frameRecordInfo = this.props.model.frameRecordInfo
        let content = "无数据"
        if (frameRecordInfo) {
            content = ""
            for (let i = 0; i < frameRecordInfo.length; ++i) {
                let frameRecord = frameRecordInfo[i]
                content += `全局 tick 序号：${frameRecord.counter}\n详细信息：\n${frameRecord.content}\n返回状态：${BevTreeExecuteStatus[frameRecord.state]}\n----------------\n`
            }
        }
        this.setState({
            message: content
        })
    }
    renderDebug(conf: BehaviorNodeTypeModel) {
        return (<div ref={this.debugInfoRef}>
            <Divider orientation="left">
                <h3>调试信息</h3>
            </Divider>
            <label className="displayLinebreak">
                {this.state.message}
            </label>
        </div>)
    }
    renderArgs(conf: BehaviorNodeTypeModel) {
        if (!conf || !conf.args || conf.args.length == 0) {
            return null;
        }

        // 普通参数
        const normalArgs = (e: ArgsDefType) => {
            const required = e.type.indexOf("?") == -1;
            if (e.type.indexOf("string") >= 0) {
                return <Input onBlur={this.handleSubmit} />;
            } else if (e.type.indexOf("int") >= 0) {
                return <InputNumber style={{ width: "100%" }} onBlur={this.handleSubmit} />;
            } else if (e.type.indexOf("boolean") >= 0) {
                return <Switch onChange={this.handleSubmit} />;
            } else if (e.type.indexOf("lua") >= 0) {
                return <Input onBlur={this.handleSubmit} placeholder={"公式"} />;
            } else if (e.type.indexOf("enum") >= 0) {
                return <Select style={{ width: "100%" }} onChange={this.handleSubmit} >
                    {
                        e.options.map((e) => {
                            return (<Option key={e.name} value={e.value}>{e.name}</Option>)
                        })
                    }
                </Select>;
            }
        };

        // 自定义参数
        const customArgs = () => {
            return (
                <Item name="customArgs" label="最终输出" key="customArgs">
                    <Input.TextArea onBlur={this.handleSubmit} style={{ minHeight: 100 }} disabled={true} />
                </Item>
            );
        };

        return (
            <div>
                <Divider orientation="left">
                    <h3>常量参数</h3>
                </Divider>
                {conf &&
                    conf.args &&
                    conf.args.map((e, i: number) => {
                        const required = e.type.indexOf("boolean") == -1 && e.type.indexOf("?") == -1;
                        return (
                            <Item
                                initialValue={e.default}
                                name={`args.${e.name}`}
                                label={e.name.substring(0, 10)}
                                key={`args.${e.name}`}
                                tooltip={{
                                    title: e.desc, icon: <InfoCircleOutlined />, getPopupContainer: () => {
                                        return document.getElementsByClassName("ant-layout-content content")[0]
                                    }
                                }}
                                valuePropName={
                                    e.type.indexOf("boolean") >= 0 ? "checked" : undefined
                                }
                                rules={[{ required, message: `${e.desc}(${e.name})为必填字段` }]}
                            >
                                {normalArgs(e)}
                            </Item>
                        );
                    })}
                {customArgs()}
            </div>
        );
    }

    renderInputs(conf: BehaviorNodeTypeModel) {
        if (!conf.input || !conf.input || conf.input.length == 0) {
            return null;
        }

        return (
            <div>
                <Divider orientation="left">
                    <h3>输入变量</h3>
                </Divider>
                {conf.input.map((e, i) => {
                    return (
                        <Item label={e} name={`input.${i}`} key={`input.${i}`}>
                            <Input onBlur={this.handleSubmit} />
                        </Item>
                    );
                })}
            </div>
        );
    }

    renderOutputs(conf: BehaviorNodeTypeModel) {
        if (!conf.output || !conf.output || conf.output.length == 0) {
            return null;
        }
        return (
            <div>
                <Divider orientation="left">
                    <h3>输出变量</h3>
                </Divider>
                {conf.output.map((e, i) => {
                    return (
                        <Item label={e} name={`output.${i}`} key={`output.${i}`}>
                            <Input onBlur={this.handleSubmit} />
                        </Item>
                    );
                })}
            </div>
        );
    }
}
