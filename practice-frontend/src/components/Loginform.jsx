import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { LOGIN } from '../queries'

const LoginForm = ({ setError, setToken }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [login] = useMutation(LOGIN, {
    onError: (error) => {
      // Safely check for the presence of graphQLErrors and message
      if (error?.graphQLErrors?.length > 0 && error.graphQLErrors[0]?.message) {
        setError(error.graphQLErrors[0].message)
      } else if (error?.message) {
        setError(error.message)
      } else {
        setError('An unknown error occurred.')
      }
    }
  })

  const submit = async (event) => {
    event.preventDefault()

    try {
      const result = await login({ variables: { username, password } })
      if (result.data) {
        const token = result.data.login.value
        setToken(token)
        localStorage.setItem('phonenumbers-user-token', token)
      }
    } catch (e) {
      // Errors are already handled in onError, so no need to setError here.
    }
  }

  return (
    <div>
      <form onSubmit={submit}>
        <div>
          username <input
            value={username}
            onChange={({ target }) => setUsername(target.value)}
          />
        </div>
        <div>
          password <input
            type='password'
            value={password}
            onChange={({ target }) => setPassword(target.value)}
          />
        </div>
        <button type='submit'>login</button>
      </form>
    </div>
  )
}

export default LoginForm