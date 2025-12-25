import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { LOGIN } from '../queries'

const Login = ({ show, setToken, setPage }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [login] = useMutation(LOGIN, {
    onError: (error) => {
      console.error('Error logging in:', error)
    }
  })

  if (!show) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()

    if (!username || !password) {
      alert('Please enter both username and password')
      return
    }

    try {
      const result = await login({
        variables: { username, password }
      })

      const token = result.data.login.value
      setToken(token)
      localStorage.setItem('library-user-token', token)
      setUsername('')
      setPassword('')
      setPage('authors')
    } catch (error) {
      console.error('Error logging in:', error)
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div>
          username
          <input
            value={username}
            onChange={({ target }) => setUsername(target.value)}
          />
        </div>
        <div>
          password
          <input
            type="password"
            value={password}
            onChange={({ target }) => setPassword(target.value)}
          />
        </div>
        <button type="submit">login</button>
      </form>
    </div>
  )
}

export default Login

