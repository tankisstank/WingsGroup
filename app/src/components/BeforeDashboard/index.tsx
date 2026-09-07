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
    </div>
  )
}

export default BeforeDashboard
