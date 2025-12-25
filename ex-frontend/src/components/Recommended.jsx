import { useQuery } from '@apollo/client/react'
import { ME, ALL_BOOKS } from '../queries'

const Recommended = (props) => {
  const userResult = useQuery(ME, {
    skip: !props.show,
  })
  const booksResult = useQuery(ALL_BOOKS, {
    skip: !props.show,
  })

  if (!props.show) {
    return null
  }

  if (userResult.loading || booksResult.loading) {
    return <div>loading...</div>
  }

  if (userResult.error || booksResult.error) {
    return <div>error loading recommended books</div>
  }

  const favoriteGenre = userResult.data?.me?.favoriteGenre
  const books = booksResult.data?.allBooks || []
  
  if (!favoriteGenre) {
    return (
      <div>
        <h2>recommendations</h2>
        <div>No favorite genre set. Please update your profile.</div>
      </div>
    )
  }

  const filteredBooks = books.filter(
    (b) => b.genres && b.genres.includes(favoriteGenre)
  )

  return (
    <div>
      <h2>recommendations</h2>
      <div>
        books in your favorite genre <b>{favoriteGenre}</b>
      </div>
      <table>
        <tbody>
          <tr>
            <th>title</th>
            <th>author</th>
            <th>published</th>
          </tr>
          {filteredBooks.map((b) => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td>{b.author.name}</td>
              <td>{b.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Recommended