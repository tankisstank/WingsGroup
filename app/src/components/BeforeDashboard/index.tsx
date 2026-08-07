import React from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <div className={`${baseClass}__heading`}>
        <p>WingsGroup CMS</p>
        <h1>Bảng điều hành CMS</h1>
      </div>
      <div
        aria-live="polite"
        className={`${baseClass}__banner`}
        role="status"
      >
        WingsGroup CMS đã sẵn sàng cho vận hành nội dung theo từng site.
      </div>
      <p className={`${baseClass}__intro`}>
        Dùng bảng điều hành bên dưới để xem số liệu thật, lead gần đây, bản nháp và các nhóm dữ
        liệu được mở theo quyền của bạn.
      </p>
      <ul className={`${baseClass}__instructions`}>
        <li>Editor tạo và cập nhật bản nháp trong các site được phân quyền.</li>
        <li>Site manager và super admin duyệt publish, import và export dữ liệu.</li>
        <li>Lead gửi về được scope theo site thông qua form gắn trên từng trang public.</li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
