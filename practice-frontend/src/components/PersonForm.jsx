import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { ALL_PERSONS, CREATE_PERSON } from '../queries'
import { updateCache } from '../App'

const PersonForm = ({ setError }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')

  const [createPerson, { loading }] = useMutation(CREATE_PERSON, {
    // refetchQueries: [{ query: ALL_PERSONS }], //we are using update
    errorPolicy: 'all',
    onError: (error) => {
      if (error?.graphQLErrors?.length > 0 && error.graphQLErrors[0]?.message) {
        setError(error.graphQLErrors[0].message)
      } else if (error?.networkError) {
        setError(error.networkError.message || 'Network error occurred')
      } else if (error?.message) {
        setError(error.message)
      } else {
        setError('An error occurred')
      }
    },
    update: (cache, response) => {
      updateCache(cache, { query: ALL_PERSONS }, response.data.addPerson)
    },
    onCompleted: (data) => {
      if (data && data.addPerson === null) {
        return
      }
      setName('')
      setPhone('')
      setStreet('')
      setCity('')
    }
  })

  const submit = async (event) => {
    event.preventDefault()
    if (!name || !street || !city) {
      setError('Name, street and city are required')
      return
    }
    createPerson({
      variables: {
        name,
        street,
        city,
        phone: phone.length > 0 ? phone : undefined
      }
    })
  }

  return (
    <div>
      <h2>create new</h2>
      <form onSubmit={submit}>
        <div>
          name <input value={name}
            onChange={({ target }) => setName(target.value)}
          />
        </div>
        <div>
          phone <input value={phone}
            onChange={({ target }) => setPhone(target.value)}
          />
        </div>
        <div>
          street <input value={street}
            onChange={({ target }) => setStreet(target.value)}
          />
        </div>
        <div>
          city <input value={city}
            onChange={({ target }) => setCity(target.value)}
          />
        </div>
        <button type='submit' disabled={loading}>add!</button>
      </form>
    </div>
  )
}

export default PersonForm