import {useState} from 'react'
import {useLocation} from 'react-router-dom'
import pkg from '../../../package.json'
import logoShort from '../../assets/logo/logo-text-short.svg'
import ServerConfigModal from "../qubic/connect/ServerConfigModal"

const Footer = () => {
  // get the name of the current route
  const {pathname} = useLocation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // if the current route is not '/bet/:id', render the footer
  if (pathname.indexOf('/bet/') === -1) {
    return (
      <div
        className="px-5 sm:px-20 md:px-100 py-16 flex flex-col sm:flex-row items-center sm:justify-between sm:items-end gap-10">
        <div className="flex gap-10">
          <img src={logoShort} alt="logo-short"/>
          <span className="text-gray-50 text-12 leading-18 font-space">
              {'\u00A9'} {new Date().getFullYear()} Qubic
            </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            style={{textDecoration: 'none', color: 'white'}}
            className="text-12 leading-18 font-space"
            target='_blank' rel="noreferrer"
            href="https://qubic.org/Terms-of-service"
          >
            Terms of service
          </a>
          <span className="text-gray-50">•</span>
          <a
            style={{textDecoration: 'none', color: 'white'}}
            className="text-12 leading-18 font-space"
            target='_blank' rel="noreferrer"
            href="https://github.com/qubic/quottery-frontend/wiki"
          >
            Wiki
          </a>
          <span className="text-gray-50">•</span>
          <a
            style={{textDecoration: 'none', color: 'white'}}
            className="text-12 leading-18 font-space"
            target='_blank' rel="noreferrer"
            href="https://qubic.org/Privacy-policy"
          >
            Privacy Policy
          </a>
          <span className="text-gray-50">•</span>
          <a
            style={{textDecoration: 'none', color: 'white'}}
            className="text-12 leading-18 font-space"
            target='_blank' rel="noreferrer"
            href="https://status.qubic.li/"
          >
            Network Status
          </a>
          <span
            className='text-gray-50 text-12 cursor-pointer'
          >
            Version {pkg.version}
          </span>
        </div>
        <ServerConfigModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}/>
      </div>
    )
  }

  return null
}

export default Footer
