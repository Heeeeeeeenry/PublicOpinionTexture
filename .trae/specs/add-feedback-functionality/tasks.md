# Tasks

- [ ] Task 1: 前端 - 添加确认弹窗功能
  - [ ] SubTask 1.1: 在ProcessingController中添加showPopoverConfirm方法（参考DispatchController）
  - [ ] SubTask 1.2: 修改handleInvalid方法，使用确认弹窗替代confirm
  - [ ] SubTask 1.3: 修改handleSubmit方法，使用确认弹窗替代confirm

- [ ] Task 2: 前端 - 构建反馈数据
  - [ ] SubTask 2.1: 在ProcessingController中添加buildFeedbackData方法
  - [ ] SubTask 2.2: 收集信件基本信息（从letterInfo和selectedLetter）
  - [ ] SubTask 2.3: 收集录音文件名称列表（从recordings数组）
  - [ ] SubTask 2.4: 收集反馈内容（从result-feedback-input）
  - [ ] SubTask 2.5: 收集上传文件名称列表（从resultFiles数组）

- [ ] Task 3: 前端 - 添加API调用方法
  - [ ] SubTask 3.1: 在ProcessingTools中添加submitFeedback方法
  - [ ] SubTask 3.2: 发送POST请求到/api/letter/，order为submit_feedback

- [ ] Task 4: 后端 - 添加反馈处理API
  - [ ] SubTask 4.1: 在letter/views.py中添加_handle_submit_feedback函数
  - [ ] SubTask 4.2: 验证信件状态是否为"正在处理"
  - [ ] SubTask 4.3: 检测信件基本信息变更并更新数据库
  - [ ] SubTask 4.4: 根据流转记录确定反馈单位
  - [ ] SubTask 4.5: 生成流转记录，备注包含诉求情况
  - [ ] SubTask 4.6: 更新文件表中的通话录音附件和办案单位反馈附件
  - [ ] SubTask 4.7: 更新信件状态为"正在反馈"
  - [ ] SubTask 4.8: 在letter_api的command_handlers中注册submit_feedback

- [ ] Task 5: 后端 - 添加数据库操作方法
  - [ ] SubTask 5.1: 在LetterDBHelper中添加submit_feedback方法
  - [ ] SubTask 5.2: 更新信件状态和处理单位
  - [ ] SubTask 5.3: 添加流转记录
  - [ ] SubTask 5.4: 更新文件表

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 5 依赖 Task 4
