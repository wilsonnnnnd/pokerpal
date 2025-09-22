type Locale = 'en' | 'zh' | string;

const dict: Record<string, Record<string, string>> = {
    en: {
            save_when_changed: 'Save and Reset buttons show only when you changed the language.',
            logout_explain: '"Logout" clears the current session only; "Delete Account" removes account info.',
            save_success: 'Settings saved locally',
            user_info: 'User',
            unnamed: 'Unnamed',
            guest_account: 'Guest account',
            identity: 'Identity',
            not_logged_in: 'Not signed in',
            software_settings: 'App settings',
            language_label: 'Language',
            save: 'Save',
            reset: 'Reset',
            save_success_title: 'Save successful',
            save_success_msg: 'Settings saved locally',
            save_fail_title: 'Save failed',
            reset_title: 'Reset settings',
            reset_confirm_msg: 'Are you sure you want to reset to defaults?',
            loading_settings: 'Loading settings…',
            logout_confirm_title: 'Confirm delete account',
            logout_confirm_msg: 'Deleting the account will remove local account data and cannot be undone. Continue?',
            cancel: 'Cancel',
            confirm: 'Confirm',
                choose_language: 'Please choose a language',
                logout: 'Logout',
                delete_account: 'Delete account',
    },
    zh: {
            save_when_changed: '保存/重置按钮仅在您修改语言设置后显示。',
            logout_explain: '“退出登录”：仅清除当前会话；“注销登录”：删除账户信息。',
            save_success: '设置已保存到本地',
            user_info: '用户信息',
            unnamed: '未命名',
            guest_account: '访客账户',
            identity: '身份',
            not_logged_in: '未登录',
            software_settings: '软件设置',
            language_label: '语言',
            save: '保存',
            reset: '重置',
            save_success_title: '保存成功',
            save_success_msg: '设置已保存到本地',
            save_fail_title: '保存失败',
            reset_title: '重置设置',
            reset_confirm_msg: '确定要重置为默认设置吗？',
            loading_settings: '加载设置…',
            logout_confirm_title: '确认注销',
            logout_confirm_msg: '注销登录将移除本地保存的账户信息，且无法恢复。确定要继续吗？',
            cancel: '取消',
            confirm: '确定',
                choose_language: '请选择语言',
                logout: '退出登录',
                delete_account: '注销登录',
    },
};

export function simpleT(key: string, locale: Locale = 'en') {
    const bucket = dict[locale] || dict['en'];
    return bucket[key] || key;
}

export default simpleT;
