import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>WingsTravel CMS đã sẵn sàng cho vận hành nội dung theo từng site.</h4>
      </Banner>
      Dùng bảng điều hành bên dưới để xem số liệu thật, lead mới, bản nháp và các nhóm dữ
      liệu được mở theo quyền của bạn.
      <ul className={`${baseClass}__instructions`}>
        <li>Editor tạo và cập nhật bản nháp trong các site được phân quyền.</li>
        <li>Site manager và super admin duyệt publish, import và export dữ liệu.</li>
        <li>Lead gửi về được scope theo site thông qua form gắn trên từng trang public.</li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
