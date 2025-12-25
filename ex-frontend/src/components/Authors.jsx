import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { ALL_AUTHORS, EDIT_AUTHOR } from '../queries'

const Authors = (props) => {
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [born, setBorn] = useState('')
  
  const result = useQuery(ALL_AUTHORS)
  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
    onError: (error) => {
      console.error('Error editing author:', error)
    }
  })

  if (!props.show) {
    return null
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  const authors = result.data?.allAuthors || []

  const submit = async (event) => {
    event.preventDefault()

    if (!selectedAuthor || !born) {
      alert('Please select an author and enter a birth year')
      return
    }

    try {
      await editAuthor({
        variables: {
          name: selectedAuthor,
          setBornTo: parseInt(born)
        }
      })

      setSelectedAuthor('')
      setBorn('')
    } catch (error) {
      console.error('Error editing author:', error)
    }
  }

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Set birth year</h3>
      <form onSubmit={submit}>
        <div>
          <select
            value={selectedAuthor}
            onChange={({ target }) => setSelectedAuthor(target.value)}
          >
            <option value="">Select author</option>
            {authors.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          born
          <input
            type="number"
            value={born}
            onChange={({ target }) => setBorn(target.value)}
          />
        </div>
        <button type="submit">update author</button>
      </form>
    </div>
  )
}

export default Authors
