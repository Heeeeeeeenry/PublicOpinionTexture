# 组织管理、专项关注、分类管理界面重构计划

## 1. 目标概述

根据现有的 `users` (用户管理) 界面的重构模式，将 `organization` (组织管理)、`special-focus` (专项关注)、`category` (分类管理) 这三个界面也重构为使用统一的 `wp-*` CSS 类和 `WpAnimation` 通用动画控制器的模块化结构。

## 2. 现状分析

这三个界面的旧版本代码位于 `old/templates/workplace/` 和 `old/static/js/workplace/` 目录下。旧代码的特点：

* HTML 结构中混杂了大量的原始 Tailwind 类，没有使用项目最新约定的通用面板、表格、表单组件样式。

* JS 代码中，所有的页面逻辑、HTML拼接和 API 请求都写在一个单独的 Controller 文件中（例如 `organization-controller.js`）。

* 动画逻辑直接调用 `anime.js` 进行硬编码。

## 3. 拟议变更

针对每个模块，我们将创建三个新文件，并更新主控制器以加载它们。

### 3.1 组织管理 (Organization)

* **创建目录**: `static/js/workplace/organization/`

* **新建文件**:

  * `organization-html.js`: 将旧的 HTML 结构转换为基于 `wp-header`, `wp-tabs-nav`, `wp-tab-btn`, `wp-tab-content`, `wp-table`, `wp-modal-overlay` 等类的结构。

  * `organization-tools.js`: 封装单位管理和下发权限管理的 API 请求（`loadUnits`, `saveUnit`, `deleteUnit`, `loadDispatchPermissions`, `saveDispatchPermission`, `deleteDispatchPermission`）。

  * `organization.js`: 实现 `OrganizationController`。处理选项卡切换，列表渲染，搜索过滤，以及使用 `WpAnimation.moveAndFadeIn` 和 `WpAnimation.popIn` 替代原有的 `anime.js` 逻辑。

### 3.2 专项关注 (Special Focus)

* **创建目录**: `static/js/workplace/special-focus/`

* **新建文件**:

  * `special-focus-html.js`: 转换为 `wp-` 通用样式类，包含列表页和新增/编辑、删除模态框。

  * `special-focus-tools.js`: 封装 API 请求（获取列表、创建、更新、删除）。

  * `special-focus.js`: 实现 `SpecialFocusController`。处理分页、过滤，及列表和模态框的通用动画。

### 3.3 分类管理 (Category)

* **创建目录**: `static/js/workplace/category/`

* **新建文件**:

  * `category-html.js`: 转换为 `wp-` 通用样式类。

  * `category-tools.js`: 封装分类数据的 API 请求。

  * `category.js`: 实现 `CategoryController`，统一动画与交互。

### 3.4 更新工作台主入口

* **修改文件**: `static/js/workplace/workplace.js`

* **变更内容**:

  1. 在 `scriptsToLoad` 列表中，添加这三个模块的 9 个新 JS 文件路径。
  2. 在 `registerPageControllers` 方法中，实例化并注册 `OrganizationController`, `SpecialFocusController`, `CategoryController`。

## 4. 假设与决策

* API 接口路径（主要是 `/api/setting/` 和 `/api/auth/`）及参数结构（`order`, `args`）保持完全不变。

* `organization` 中的“单位管理”和“下发权限”两个选项卡，采用新的通用选项卡样式（即 `wp-tabs-nav` 配合 `wp-tab-content`）进行重构，保持其原有业务逻辑。

* 采用与 `users` 完全相同的重构流程，确保所有的 `alert` 被替换为 `window.workplace.showNotification` 以提升用户体验。

## 5. 验证步骤

1. 打开浏览器并刷新，检查工作台左侧菜单中的“组织管理”、“专项关注”、“分类管理”是否能正常点击并切换。
2. 验证各个页面的入场动画（自上而下、从左至右）是否丝滑。
3. 测试各模块的模态框打开与关闭动画（弹入与弹出）是否符合预期。
4. 验证这三个模块的列表数据加载、搜索和分页功能是否正常工作。

