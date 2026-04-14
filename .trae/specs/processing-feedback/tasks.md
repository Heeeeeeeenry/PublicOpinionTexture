# Tasks
- [x] Task 1: Copy and implement `showPopoverConfirm` from `dispatch.js` to `processing.js`. Replace `confirm()` in `handleSubmit` and `handleInvalid` with `showPopoverConfirm()`.
- [x] Task 2: Modify `handleSubmit` and `handleInvalid` in `processing.js` to collect complete feedback data.
  - [x] SubTask 2.1: Collect modified letter details: `群众姓名`, `手机号`, `身份证号`, `来信时间`, `来信渠道`, `信件一级/二级/三级分类`, `诉求内容`, `专项关注标签`.
  - [x] SubTask 2.2: Extract filenames from `this.recordings` (联系群众的录音文件名称) and `this.resultFiles` (上传文件的文件名称).
  - [x] SubTask 2.3: Collect feedback content (`this.remarkContent`).
- [x] Task 3: Update API calling methods in `processing-tools.js` (`submitLetter`, `markInvalid`) to pass the collected data object.
- [x] Task 4: Implement or update `_handle_submit_feedback` and `_handle_mark_invalid` in `apps/letter/views.py`.
  - [x] SubTask 4.1: Perform data change comparison similar to `_handle_dispatch` (detect changes, save `change_records`).
  - [x] SubTask 4.2: Retrieve flow history to determine the previous processing unit (which dispatched the letter to the current unit). This will be the "feedback unit" (反馈单位).
  - [x] SubTask 4.3: Generate a new flow record. For `submit_feedback`, add `"诉求情况": "属实"` to the remark. For `mark_invalid`, add `"诉求情况": "不属实"` to the remark. Include recording filenames, uploaded filenames, feedback content, and info changes.
  - [x] SubTask 4.4: Call database helper functions to update the `信件表` status (e.g., to "正在反馈" or "已办结") and append to the `流转表`.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
