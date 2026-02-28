"""
Books Routes
Handles book catalog, book details, recommendations, and reading progress
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from utils.decorators import require_auth
from datetime import datetime

books_bp = Blueprint('books', __name__)

# Difficulty mapping for filtering
DIFFICULTY_ORDER = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3
}

@books_bp.route('/catalog', methods=['GET'])
@require_auth
def get_books_catalog(current_user):
    """
    Get all books in the catalog with optional filtering
    Query params:
        - source: Filter by source (app, Teacher, user)
        - difficulty: Filter by difficulty (Beginner, Intermediate, Advanced)
    """
    try:
        db = get_db()
        books_ref = db.collection('books')
        
        # Get query parameters
        source = request.args.get('source')
        difficulty = request.args.get('difficulty')
        
        # Apply filters
        query = books_ref
        if source:
            query = query.where('source', '==', source)
        if difficulty:
            query = query.where('difficulty', '==', difficulty)
        
        # Get all books
        books_docs = query.stream()
        books_list = []
        
        for doc in books_docs:
            book_data = doc.to_dict()
            book_data['bookId'] = doc.id
            books_list.append(book_data)
        
        return jsonify({
            'success': True,
            'books': books_list,
            'count': len(books_list)
        }), 200
        
    except Exception as e:
        print(f"Get books error: {str(e)}")
        return jsonify({'error': 'Failed to get books'}), 500

@books_bp.route('/book/<book_id>', methods=['GET'])
@require_auth
def get_book_details(current_user, book_id):
    """Get detailed information about a specific book"""
    try:
        db = get_db()
        book_doc = db.collection('books').document(book_id).get()
        
        if not book_doc.exists:
            return jsonify({'error': 'Book not found'}), 404
        
        book_data = book_doc.to_dict()
        book_data['bookId'] = book_doc.id
        
        return jsonify({
            'success': True,
            'book': book_data
        }), 200
        
    except Exception as e:
        print(f"Get book details error: {str(e)}")
        return jsonify({'error': 'Failed to get book details'}), 500

@books_bp.route('/recommended', methods=['GET'])
@require_auth
def get_recommended_books(current_user):
    """
    Get recommended books based on user's progress and points
    Returns categorized books: recommended, teacher materials, student uploads, app books
    """
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        points = user_data.get('points', 0)
        progress = user_data.get('progress', [])
        
        # Get completed book IDs
        completed_book_ids = [p.get('bookId') for p in progress if p.get('sentencesRead', 0) >= p.get('totalSentences', 0)]
        
        # Determine max difficulty based on points
        max_difficulty = 'Beginner'
        if points >= 400:
            max_difficulty = 'Advanced'
        elif points >= 200:
            max_difficulty = 'Intermediate'
        
        max_difficulty_level = DIFFICULTY_ORDER[max_difficulty]
        
        # Get all books
        all_books = db.collection('books').stream()
        
        recommended = []
        teacher_materials = []
        student_uploads = []
        app_books = []
        
        for doc in all_books:
            book_data = doc.to_dict()
            book_data['bookId'] = doc.id
            
            book_difficulty = book_data.get('difficulty', 'Beginner')
            book_source = book_data.get('source', 'app')
            
            # Categorize books
            if book_source == 'Teacher':
                teacher_materials.append(book_data)
            elif book_source == 'user':
                student_uploads.append(book_data)
            elif book_source == 'app':
                app_books.append(book_data)
            
            # Add to recommended if not completed and within difficulty
            if (doc.id not in completed_book_ids and 
                DIFFICULTY_ORDER.get(book_difficulty, 1) <= max_difficulty_level):
                recommended.append(book_data)
        
        # Limit recommended to top 5
        recommended = recommended[:5]
        
        return jsonify({
            'success': True,
            'recommended': recommended,
            'teacherMaterials': teacher_materials,
            'studentUploads': student_uploads,
            'appBooks': app_books
        }), 200
        
    except Exception as e:
        print(f"Get recommended books error: {str(e)}")
        return jsonify({'error': 'Failed to get recommended books'}), 500

@books_bp.route('/last-unfinished', methods=['GET'])
@require_auth
def get_last_unfinished_book(current_user):
    """Get the last book the user was reading but didn't finish"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress = user_data.get('progress', [])
        
        if not progress:
            return jsonify({
                'success': True,
                'book': None
            }), 200
        
        # Find unfinished books
        unfinished = [p for p in progress if p.get('sentencesRead', 0) < p.get('totalSentences', 0)]
        
        # Get the book ID
        if unfinished:
            book_id = unfinished[-1].get('bookId')
        else:
            # If no unfinished, return last read book
            book_id = progress[-1].get('bookId')
        
        # Get book details
        book_doc = db.collection('books').document(str(book_id)).get()
        
        if not book_doc.exists:
            return jsonify({
                'success': True,
                'book': None
            }), 200
        
        book_data = book_doc.to_dict()
        book_data['bookId'] = book_doc.id
        
        return jsonify({
            'success': True,
            'book': book_data
        }), 200
        
    except Exception as e:
        print(f"Get last unfinished book error: {str(e)}")
        return jsonify({'error': 'Failed to get last unfinished book'}), 500

@books_bp.route('/upload', methods=['POST'])
@require_auth
def upload_book(current_user):
    """
    Upload a new book (for teachers and students)
    Expected body:
    {
        "title": "Book Title",
        "writer": "Author Name",
        "publisher": "Publisher",
        "difficulty": "Beginner|Intermediate|Advanced",
        "source": "Teacher|user",
        "contents": ["sentence 1", "sentence 2", ...],
        "cover": "image_url"
    }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'writer', 'difficulty', 'source', 'contents']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get user info to determine publisher
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        user_role = user_data.get('role', 'Student')
        
        # Create book document
        book_data = {
            'title': data['title'],
            'writer': data['writer'],
            'publisher': data.get('publisher', f'{user_role} Upload'),
            'difficulty': data['difficulty'],
            'source': data['source'],
            'contents': data['contents'],
            'sentenceCount': len(data['contents']),
            'cover': data.get('cover', 'https://picsum.photos/seed/default/400/250'),
            'uploadedBy': uid,
            'uploadedAt': datetime.now()
        }
        
        # Add to database
        book_ref = db.collection('books').document()
        book_ref.set(book_data)
        
        book_data['bookId'] = book_ref.id
        
        return jsonify({
            'success': True,
            'message': 'Book uploaded successfully',
            'book': book_data
        }), 201
        
    except Exception as e:
        print(f"Upload book error: {str(e)}")
        return jsonify({'error': 'Failed to upload book'}), 500

@books_bp.route('/search', methods=['GET'])
@require_auth
def search_books(current_user):
    """
    Search books by title or writer
    Query params:
        - q: Search query
    """
    try:
        query = request.args.get('q', '').lower()
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        db = get_db()
        all_books = db.collection('books').stream()
        
        matching_books = []
        for doc in all_books:
            book_data = doc.to_dict()
            title = book_data.get('title', '').lower()
            writer = book_data.get('writer', '').lower()
            
            if query in title or query in writer:
                book_data['bookId'] = doc.id
                matching_books.append(book_data)
        
        return jsonify({
            'success': True,
            'books': matching_books,
            'count': len(matching_books)
        }), 200
        
    except Exception as e:
        print(f"Search books error: {str(e)}")
        return jsonify({'error': 'Failed to search books'}), 500
