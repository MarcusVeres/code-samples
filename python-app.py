from flask import Flask, redirect, render_template, request, Response, send_file, session, url_for
import time, os
from passlib.hash import sha256_crypt
from pymongo import Connection
import pymongo
import ConfigParser
from bson.json_util import dumps

config = ConfigParser.ConfigParser()
config.readfp(open('config.ini'))

con = pymongo.Connection( host='localhost' , port=27017 )
col = con['juice-nfc']

app = Flask(__name__)

# authentication functions

@app.route('/logout')
def logout():
    session.clear()
    return render_template('success.html')

@app.route('/auth', methods=['POST'])
def auth():

    userdata = col.users.find({ 'username' : request.form['username'] })
 
    if userdata.count() is 0 :
        return "could not find that user"

    if request.form['password'] != userdata[0]['password'] :
        return "wrong password" 

    session_data = {
        'user' : userdata[0]['username'],
        'id' : str(userdata[0]['_id'])
    }
    session['userdata'] = session_data

    return render_template('success.html')

    #
    
#    def login(self, request) :
#
#        if not userdata :
#            flash('Login Failed', 'danger')
#            return False
#
#        if sha256_crypt.verify(request.form.get('password'), userdata.get('password')) :
#            session_data = {
#                'email' : userdata.get('email'),
#                'admin' : userdata.get('admin'),
#                'id'    : str(userdata.get('_id'))
#            }
#            session['userdata'] = session_data
#            flash('Login Successful', 'success')
#            return True
#
#        flash('Login Failed', 'danger')

# database functions

@app.route('/main')
def main():
    return render_template('main.html')

@app.route('/stuff')
def stuff():
    return redirect("/", code=302)

# this is called by angular and it returns some stuff
# hooray!

@app.route("/find")
def find():
    city = request.args.get('city')
    if not city :
        # return Response(dumps({'error':'true', 'message' : 'Please provide a city'}), status=400, mimetype="application/json")
        cursor = col.players.find()
    else :
        cursor = col.players.find({'city': city})
    return Response(dumps(cursor, encoding="UTF-8"), status=200, mimetype="application/json")

# get player details
@app.route("/get_player")
def get_player():
    user_id = request.args.get('user_id')
    if not user_id : 
        return Response(dumps({'error':'true', 'message' : 'Please provide a user ID'}), status=400, mimetype="application/json")
    else : 
        cursor = col.players.find({'url': user_id})
    return Response(dumps(cursor, encoding="UTF-8"), status=200, mimetype="application/json")
    
# set player details
@app.route("/set_player")
def set_player():

    user_id = request.args.get('user_id')
    full_name = request.args.get('full_name')
    points = int(request.args.get('points'))
    url = request.args.get('url')
    city = request.args.get('city')
    region = request.args.get('region')
    respiratory = request.args.get('respiratory')
    pradaxa = request.args.get('pradaxa')

    if not user_id : 
        return Response(dumps({'error':'true', 'message' : 'Please provide a user ID'}), status=400, mimetype="application/json")
    else : 
        cursor = col.players.update(
            {'url': user_id},
            { '$set': { 
                'points' : points , 
                'full_name' : full_name , 
                'url' : url ,
                'city' : city , 
                'region' : region,
                'respiratory' : respiratory,
                'pradaxa' : pradaxa 
                }
            }
        )

    return Response(dumps(cursor, encoding="UTF-8"), status=200, mimetype="application/json")

# create a new player
@app.route("/create_player")
def create_player():

    full_name = request.args.get('full_name')
    points = 0
    url = request.args.get('url')
    city = request.args.get('city')
    region = request.args.get('region')
    respiratory = request.args.get('respiratory')
    pradaxa = request.args.get('pradaxa')

    # check if already exists
    cursor = col.players.find({'url': url})

    if cursor.count() is 0 :
        new_player = col.players.insert(
            { 
                'full_name' : full_name , 
                'points' : points , 
                'url' : url ,
                'city' : city , 
                'region' : region,
                'respiratory' : respiratory,
                'pradaxa' : pradaxa 
            }
        )
        return Response(dumps(new_player, encoding="UTF-8"), status=200, mimetype="application/json")
    else :
        return Response(dumps({'error':'true', 'message' : 'This bracelet is already assiged to a user.'}), status=400, mimetype="application/json")

# delete an existing player
@app.route("/delete_player")
def delete_player():
    cursor = col.players.remove({ 'url': request.args.get('url') })
    return Response(dumps(cursor, encoding="UTF-8"), status=200, mimetype="application/json")

# standard add points to user
@app.route("/add_points")
def add_points():

    user_id = request.args.get('user_id')
    if not user_id : 
        return Response(dumps({'error':'true', 'message' : 'Please provide a user ID'}), status=400, mimetype="application/json")
    else : 

        # add five points to the player's score
        cursor = col.players.find({'url': user_id}) 

        if cursor.count() is 0 :
            return "not_found"

        points = int(cursor[0]['points']) #fucking mongo stores numbers as strings...
        points += 5

        col.players.update( 
            { 'url': user_id },
            { '$set': { 'points' : points } } 
        )

    return Response(dumps(cursor, encoding="UTF-8"), status=200, mimetype="application/json")

# return the top players for the leaderboard
@app.route("/get_leaders")
def get_leaders(): 

    overall = col.players.find().sort([ ('points', -1) ])
    one = col.players.find({'region':'One'}).sort([ ('points', -1) ]).limit(5)
    two = col.players.find({'region':'Two'}).sort([ ('points', -1) ]).limit(5)
    three = col.players.find({'region':'Three'}).sort([ ('points', -1) ]).limit(5)

    score_pak = {'overall': overall, 'one': one, 'two': two, 'three': three}

    return Response(dumps(score_pak, encoding="UTF-8"), status=200, mimetype="application/json")

# return a leaderboard for a particular section
@app.route("/get_region")
def get_region():
    board = col.players.find({ 'region' : request.args.get('region') }).sort([ ('points', -1) ])
    return Response(dumps(board, encoding="UTF-8"), status=200, mimetype="application/json")

# public page that does not require authentication
@app.route('/public')
def public():
    return render_template('public.html')

# public page that does not require authentication
# this is done a shitty way because it is late and I'm tired, and python is being a bitch
@app.route('/pr_1')
def public_region_1():
    return render_template('public.html')
@app.route('/pr_2')
def public_region_2():
    return render_template('public.html')
@app.route('/pr_3')
def public_region_3():
    return render_template('public.html')

# create catch-all that sends the user to add_points
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return render_template('main.html') #'You want path: %s' % path

# reset EVERYTHING to 0

@app.route('/armageddon')
def armageddon():

    col.players.update(
        {}, 
        {'$set': {'points': 0}}, 
        False, False, None, True # the last parameter is multi
    )
    return True

#

app.secret_key = config.get('global' , 'pepper')

#

if __name__ == '__main__':
    app.run( 
        debug = config.get('global','debug'), 
        host = config.get('global','host'),
        port = int(config.get('global','port'))
    )

