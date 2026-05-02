"""
Class Management Routes
Handles class creation, enrollment, and student management
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from utils.decorators import require_auth
from datetime import datetime
import string
import random

class_bp = Blueprint('class', __name__)

def generate_class_code(length=8):
    """Generate a random alphanumeric class code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

@class_bp.route('/<class_id>', methods=['GET'])
@require_auth
def get_class_details(current_user, class_id):
    """Get details of a specific class"""
    try:
        db = get_db()
        class_doc = db.collection('classes').document(class_id).get()
        
        if not class_doc.exists:
            return jsonify({'error': 'Class not found'}), 404
            
        class_data = class_doc.to_dict()
        class_data['id'] = class_doc.id
        
        return jsonify({
            'success': True,
            'class': class_data
        }), 200
        
    except Exception as e:
        print(f"Get class details error: {str(e)}")
        return jsonify({'error': 'Failed to get class details'}), 500

@class_bp.route('/enroll', methods=['POST'])
@require_auth
def enroll_in_class(current_user):
    """Enroll a student in a class using a class code"""
    try:
        uid = current_user['uid']
        data = request.get_json()
        class_code = data.get('code')
        
        if not class_code:
            return jsonify({'error': 'Class code is required'}), 400
            
        db = get_db()
        # Find class by code
        classes_ref = db.collection('classes')
        query = classes_ref.where('code', '==', class_code.upper()).limit(1).get()
        
        if not query:
            return jsonify({'error': 'Invalid class code'}), 404
            
        class_doc = query[0]
        class_id = class_doc.id
        class_data = class_doc.to_dict()
        
        # Update class students list
        students = class_data.get('students', [])
        if uid not in students:
            students.append(uid)
            db.collection('classes').document(class_id).update({'students': students})
            
        # Update user's enrolled class
        db.collection('users').document(uid).update({
            'classEnrolled': class_id,
            'enrolledCode': class_code.upper()
        })
        
        return jsonify({
            'success': True,
            'message': f"Successfully enrolled in {class_data.get('teacherName')}'s class",
            'class': {
                'id': class_id,
                'code': class_data.get('code'),
                'teacherName': class_data.get('teacherName')
            }
        }), 200
        
    except Exception as e:
        print(f"Enroll error: {str(e)}")
        return jsonify({'error': 'Failed to enroll in class'}), 500

@class_bp.route('/create', methods=['POST'])
@require_auth
def create_class(current_user):
    """Create a new class (Sets user role to Teacher)"""
    try:
        uid = current_user['uid']
        db = get_db()
        
        # Get current user data
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        user_data = user_doc.to_dict()
        
        class_code = generate_class_code()
        
        # 1. Create class document
        new_class = {
            'teacherID': uid,
            'teacherName': user_data.get('name', 'Teacher'),
            'code': class_code,
            'students': [],
            'bookId': [],
            'createdAt': datetime.now()
        }
        
        class_ref = db.collection('classes').document()
        class_id = class_ref.id
        
        # 2. Use batch for atomic update
        batch = db.batch()
        batch.set(class_ref, new_class)
        batch.update(user_ref, {
            'role': 'Teacher',
            'classCode': class_code,
            'ownedClassId': class_id,
            'updatedAt': datetime.now()
        })
        
        batch.commit()
        
        return jsonify({
            'success': True,
            'message': 'Class created successfully',
            'class': {
                'id': class_id,
                'code': class_code
            }
        }), 201

        
    except Exception as e:
        print(f"Create class error: {str(e)}")
        return jsonify({'error': 'Failed to create class'}), 500

@class_bp.route('/teacher/class-students', methods=['GET'])
@require_auth
def get_teacher_class_students(current_user):
    """Get the teacher's primary class and full profiles of all students in it"""
    try:
        uid = current_user['uid']
        db = get_db()
        
        # 1. Find the class
        classes = db.collection('classes').where('teacherID', '==', uid).limit(1).get()
        if not classes:
            return jsonify({'success': True, 'class': None, 'students': []}), 200
            
        class_doc = classes[0]
        class_data = class_doc.to_dict()
        class_data['id'] = class_doc.id
        
        # 2. Get student profiles
        student_ids = class_data.get('students', [])
        students = []
        
        if student_ids:
            # Firestore supports 'in' queries for up to 30 items
            # For larger classes, we would need to batch or fetch individually
            # But for simplicity, we'll fetch them in batches or individually
            for student_id in student_ids:
                user_doc = db.collection('users').document(student_id).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    user_data['id'] = user_doc.id
                    students.append(user_data)
                    
        return jsonify({
            'success': True,
            'class': class_data,
            'students': students
        }), 200
        
    except Exception as e:
        print(f"Get class students error: {str(e)}")
        return jsonify({'error': 'Failed to get students'}), 500


@class_bp.route('/aggregates', methods=['GET'])
@require_auth
def get_class_aggregates(current_user):
    """
    Get aggregate performance stats for all students in the teacher's class.
    """
    try:
        uid = current_user['uid']
        db = get_db()
        
        # 1. Find the class(es)
        classes = db.collection('classes').where('teacherID', '==', uid).get()
        if not classes:
            return jsonify({'success': True, 'aggregates': None}), 200
            
        all_student_ids = []
        for c in classes:
            all_student_ids.extend(c.to_dict().get('students', []))
        
        unique_student_ids = list(set(all_student_ids))
        if not unique_student_ids:
             return jsonify({
                 'success': True, 
                 'aggregates': {
                     'totalStudents': 0,
                     'levelDistribution': {'Beginner': 0, 'Intermediate': 0, 'Advanced': 0},
                     'avgBooksCompleted': 0,
                     'atRiskStudents': []
                 }
             }), 200

        # 2. Build aggregates
        level_counts = {'Beginner': 0, 'Intermediate': 0, 'Advanced': 0}
        total_books_completed = 0
        at_risk_students = []
        
        # Cache for book difficulty
        book_cache = {}
        
        for sid in unique_student_ids:
            # Get student progress
            progress_docs = db.collection('userProgress').where('userId', '==', sid).get()
            progress_list = [d.to_dict() for d in progress_docs]
            
            # Get student info
            user_doc = db.collection('users').document(sid).get()
            user_data = user_doc.to_dict() if user_doc.exists else {}
            
            # Calculate individual level
            completed_progress = [p for p in progress_list if p.get('completed')]
            total_books_completed += len(completed_progress)
            
            # Fetch difficulties for level calculation
            book_difficulties = []
            for p in completed_progress:
                bid = str(p.get('bookId'))
                if bid not in book_cache:
                    b_doc = db.collection('books').document(bid).get()
                    book_cache[bid] = b_doc.to_dict().get('difficulty', 'Beginner') if b_doc.exists else 'Beginner'
                book_difficulties.append(book_cache[bid])
            
            # Simple level calc logic (match frontend)
            diff_map = {'Easy': 1, 'Beginner': 1, 'Intermediate': 2, 'Hard': 3, 'Advanced': 3}
            count = len(book_difficulties)
            avg = sum(diff_map.get(d, 1) for d in book_difficulties) / count if count > 0 else 0
            
            level = 'Beginner'
            if avg >= 2.5 or (avg >= 2.0 and count >= 50): level = 'Advanced'
            elif avg >= 1.5 or count >= 30: level = 'Intermediate'
            
            level_counts[level] += 1
            
            # Check for at-risk (no session in 7 days)
            last_session = db.collection('readingSessions').where('userId', '==', sid).order_by('startedAt', direction='DESCENDING').limit(1).get()
            if last_session:
                started_at = last_session[0].to_dict().get('startedAt')
                if started_at:
                    # Convert to datetime if it's a timestamp
                    if hasattr(started_at, 'timestamp'):
                         days_diff = (datetime.now() - started_at).days
                         if days_diff >= 7:
                             at_risk_students.append({
                                 'id': sid,
                                 'name': user_data.get('name', 'Unknown'),
                                 'daysSince': days_diff
                             })
            else:
                at_risk_students.append({
                    'id': sid,
                    'name': user_data.get('name', 'Unknown'),
                    'daysSince': 999 # Never
                })

        return jsonify({
            'success': True,
            'aggregates': {
                'totalStudents': len(unique_student_ids),
                'levelDistribution': level_counts,
                'avgBooksCompleted': round(total_books_completed / len(unique_student_ids), 1),
                'atRiskStudents': at_risk_students
            }
        }), 200
        
    except Exception as e:
        print(f"Get class aggregates error: {str(e)}")
        return jsonify({'error': 'Failed to get class aggregates'}), 500

@class_bp.route('/remove-student', methods=['POST'])
@require_auth
def remove_student(current_user):
    """Remove a student from a class (Teacher only)"""
    try:
        uid = current_user['uid']
        data = request.get_json()
        student_id = data.get('studentId')
        class_id = data.get('classId')
        
        if not student_id or not class_id:
            return jsonify({'error': 'studentId and classId are required'}), 400
            
        db = get_db()
        
        # Verify user is the teacher of this class
        class_ref = db.collection('classes').document(class_id)
        class_doc = class_ref.get()
        if not class_doc.exists:
            return jsonify({'error': 'Class not found'}), 404
            
        if class_doc.to_dict().get('teacherID') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Atomic update
        batch = db.batch()
        batch.update(class_ref, {'students': firestore.ArrayRemove([student_id])})
        batch.update(db.collection('users').document(student_id), {
            'classEnrolled': None,
            'enrolledCode': None
        })
        
        batch.commit()
        
        return jsonify({'success': True, 'message': 'Student removed successfully'}), 200
        
    except Exception as e:
        print(f"Remove student error: {str(e)}")
        return jsonify({'error': 'Failed to remove student'}), 500

@class_bp.route('/leave', methods=['POST'])
@require_auth
def leave_class(current_user):
    """Remove current user from their enrolled class"""
    try:
        uid = current_user['uid']
        db = get_db()
        
        user_doc = db.collection('users').document(uid).get()
        user_data = user_doc.to_dict()
        class_id = user_data.get('classEnrolled')
        
        if not class_id:
            return jsonify({'error': 'Not enrolled in any class'}), 400
            
        # Remove from class students list
        class_ref = db.collection('classes').document(class_id)
        class_doc = class_ref.get()
        if class_doc.exists:
            db.collection('classes').document(class_id).update({
                'students': firestore.ArrayRemove([uid])
            })
                
        # Update user
        db.collection('users').document(uid).update({
            'classEnrolled': None,
            'enrolledCode': None
        })
        
        return jsonify({
            'success': True,
            'message': 'Successfully left the class'
        }), 200
        
    except Exception as e:
        print(f"Leave class error: {str(e)}")
        return jsonify({'error': 'Failed to leave class'}), 500

