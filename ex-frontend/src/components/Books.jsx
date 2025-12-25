import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { ALL_BOOKS, BOOK_ADDED } from '../queries'

const Books = (props) => {
  const result = useQuery(ALL_BOOKS)
  const [selectedGenre, setSelectedGenre] = useState('all')

  useEffect(() => {
    if (result.data) {
      const unsubscribe = result.subscribeToMore({
        document: BOOK_ADDED,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev  //Safety check ,Avoids crashing on malformed payloads
          const newBook = subscriptionData.data.bookAdded
          // Check if book already exists to avoid duplicates
          const exists = prev.allBooks.some(book => book.id === newBook.id)
          if (exists) return prev
          return {
            allBooks: [...prev.allBooks, newBook]
          }
        }
      })
      return () => unsubscribe()
    }
  }, [result.data, result.subscribeToMore])

  if (!props.show) {
    return null
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  const books = result.data?.allBooks || []

  // Get all unique genres from books
  const genres = Array.from(
    new Set(
      books.reduce((acc, book) => (
        book.genres ? acc.concat(book.genres) : acc
      ), [])
    )
  )

  // Filter books by selected genre
  const filteredBooks = selectedGenre === 'all'
    ? books
    : books.filter(book => book.genres && book.genres.includes(selectedGenre));

  return (
    <div>
      <h2>books</h2>

      {/* Genre Filter Buttons */}
      <div>
        <button
          onClick={() => setSelectedGenre('all')}
          style={{ fontWeight: selectedGenre === 'all' ? 'bold' : 'normal' }}
        >
          all genres
        </button>
        {genres.map(genre =>
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            style={{ fontWeight: selectedGenre === genre ? 'bold' : 'normal' }}
          >
            {genre}
          </button>
        )}
      </div>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {filteredBooks.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Books
