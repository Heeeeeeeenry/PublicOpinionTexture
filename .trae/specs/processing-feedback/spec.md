# Processing Feedback Spec

## Why
在处理工作台中，用户处理完信件后需要通过点击“提交”或“不属实”按钮来进行反馈。该反馈不仅需要提交信件被修改的基本信息，还需提交联系群众的录音文件名称、上传的反馈附件名称以及反馈内容。为了防止误操作，需要使用与下发工作台一致的气泡确认框，并在后端记录详细的变更和流转轨迹。

## What Changes
- **前端页面交互 (`static/js/workplace/processing/processing.js`)**:
  - 完全照搬下发工作台 (`dispatch.js`) 中的 `showPopoverConfirm` 方法，用于“提交”和“不属实”按钮的确认提示。
  - 修改 `handleSubmit` 和 `handleInvalid` 方法，使其构建包含信件所有基本信息、分类、诉求内容、录音文件名称列表、反馈附件名称列表以及反馈内容的数据对象。
- **前端工具类 (`static/js/workplace/processing/processing-tools.js`)**:
  - 新增或修改 `submitFeedback` 和 `invalidFeedback` 的 API 请求方法，将构建好的完整数据对象发送至后端。
- **后端接口 (`apps/letter/views.py`)**:
  - 新增或修改对应的 `_handle_submit_feedback` 和 `_handle_invalid_feedback`（或修改原有的 `_handle_mark_invalid`）逻辑。
  - 后端接收到数据后，参考下发逻辑，比对 `群众姓名`、`手机号`、`身份证号`、`诉求内容`、`信件分类` 等字段的变化，生成 `change_records` 并更新至 `信件表`。
  - 通过查询 `流转表` 中的历史流转记录，确定该信件的上一个处理单位（即下发单位），将其作为本次的“反馈单位”。
  - 生成新的流转记录，备注中明确添加 `"诉求情况": "属实"`（提交按钮）或 `"诉求情况": "不属实"`（不属实按钮），并包含反馈内容以及信息变更详情。
  - 更新信件的 `当前信件状态` 和 `当前信件处理单位`，并将流转记录写入 `流转表`。

## Impact
- Affected specs: 处理工作台反馈能力。
- Affected code:
  - `static/js/workplace/processing/processing.js`
  - `static/js/workplace/processing/processing-tools.js`
  - `apps/letter/views.py`
  - `apps/letter/db_utils.py`

## MODIFIED Requirements
### Requirement: 处理工作台反馈功能
系统应允许处理工作台的用户对信件进行反馈（“提交”或“不属实”）。
- **WHEN** 用户点击“提交”或“不属实”按钮
- **THEN** 系统弹出气泡确认框。确认后，系统收集信件详情、录音文件名、附件文件名、反馈备注等，向后端发起请求。后端进行字段对比保存，并根据流转记录找到反馈单位，生成带有“诉求情况”和所有变更记录的流转节点，更新信件状态。
