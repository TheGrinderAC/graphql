import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { FIND_PERSON } from '../queries'

const Person = ({ person, onClose }) => {
  return (
    <div>
      <h2>{person.name}</h2>
      <div>
        {person.address?.street} {person.address?.city}
      </div>
      <div>{person.phone ? person.phone : 'No phone'}</div>
      <button onClick={onClose}>close</button>
    </div>
  )
}

const Persons = ({ persons }) => {
  const [nameToSearch, setNameToSearch] = useState(null)
  
  const { data, loading, error } = useQuery(FIND_PERSON, {
    variables: { nameToSearch },
    skip: !nameToSearch,
  })

  if (nameToSearch) {
    if (loading) {
      return <div>loading...</div>
    }
    if (error) {
      return (
        <div>
          <p>Error fetching person details.</p>
          <button onClick={() => setNameToSearch(null)}>close</button>
        </div>
      )
    }
    if (data && data.findPerson) {
      return (
        <Person
          person={data.findPerson}
          onClose={() => setNameToSearch(null)}
        />
      )
    }
    // Edge case: completed but no data found
    return (
      <div>
        <p>Person not found.</p>
        <button onClick={() => setNameToSearch(null)}>close</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Persons</h2>
      {persons.map((p) => (
        <div key={p.id}>
          {p.name} {p.phone ? p.phone : ''}
          <button onClick={() => setNameToSearch(p.name)}>
            show address
          </button>
        </div>
      ))}
    </div>
  )
}

export default Persons