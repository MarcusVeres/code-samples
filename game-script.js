/*

    SMU48
    Marcus Veres
    2014

    -----------

    Conventions: 

        variable_names
        functionNames
        ClassNames

*/

window.addEventListener('load', function()
{

    var user_options = {
        difficulty : 2
    }

    window.smu48 = (function()
    {
        // define canvas and set canvas properties
        var canvas = document.getElementById('gameCanvas').getContext('2d');
        var gameFrame = canvas.canvas;
        var frame_width = gameFrame.width;
        var frame_height = gameFrame.height;

        // set up the game asset holders
        var animateInterval = null;
        var array_of_enemies = [];
        var enemy_generator = null;
        var array_of_shots = [];
        var player = null;

        var game_paused = false;
        var score = 0;
        var top_score = 0;        

        // define the [default] game properties
        var properties = {
            difficulty        : 1,
            refresh_rate      : 20
        }

        // ------------------------------------------------------------------------------------------------------------
        // Player functions

        function Player()
        {
            //
            this.level = 1; 
            this.health = 2;
            this.points = Math.pow( 2 , 1 );

            // positioning
            this.height     = 64;
            this.width      = 64;
            this.y          = frame_height - this.height - 20;
            this.x          = frame_width/2 - this.width/2;
            this.speed      = 7;
            this.direction  = 1; // positive, going down

            // movement
            this.moving_left = false;
            this.moving_right = false;
            this.moving_up = false;
            this.moving_down = false;

            // misc
            this.color = '#3595df'; // later on, this will be random, or determined by the value

        }

        Player.prototype.updatePosition = function()
        {
            if( this.moving_right !== false ){
                if( this.x + this.width + this.speed < frame_width ){
                    this.x += this.speed;
                }
            }
            if( this.moving_left !== false ){
                if( this.x - this.speed > 0 ){
                    this.x -= this.speed;
                }
            }
            if( this.moving_up !== false ){
                if( this.y - this.speed > 20 ){
                    this.y -= this.speed;
                }
            }
            if( this.moving_down !== false ){
                if( this.y + this.speed + this.height < frame_height - 20 ){
                    this.y += this.speed;
                }
            }
        }

        //
        Player.prototype.addPoints = function(){
            this.level++;
            console.log("current level is " , this.level);
            this.points *= 2;
            if( this.points >= 2048 ){
                stopGame();
                document.getElementById('hud').innerHTML = 'YOU ARE WINRAR!';
            } 
        }
        Player.prototype.removePoints = function(){
            this.level--;
            console.log("current level is " , this.level);
            this.points /= 2;
            if( this.points < 2 ) {
                stopGame();
                document.getElementById('hud').innerHTML = 'Game Over, man... GAME OVER!';
            }
        }

        // 
        Player.prototype.moveLeft = function(){
            this.x += this.speed;
        }
        Player.prototype.moveRight = function(){
            this.x -= this.speed;
        }

        // 
        Player.prototype.shoot = function(){
            var shot = new Projectile();
        }


        // ------------------------------------------------------------------------------------------------------------
        // The Enemy

        function Enemy()
        {
            // values
            //this.level = Math.floor(Math.random() * 4 + 1); // random between 1 and 3 // TODO : base the squares on the player level
            this.level = weightedRandom();
            this.points = Math.pow( 2 , this.level );
            this.hitPoints = this.level; // starting hit points

            console.log("the level is " , this.level);

            // positioning
            this.height     = 64;
            this.width      = 64;
            this.y          = -this.height;
            this.x          = Math.floor( Math.random() * (frame_width - this.width) ); // between left edge + width, and right edge - width
            // this.speed      = 0.6 * this.level + 3.6;
            this.speed      = 2;
            this.direction  = 1; // positive, going down

            // misc
            this.color = '#f2b179'; // later on, this will be random, or determined by the value

            // add the enemy to the enemies array
            // they will be rendered on the next frame
            array_of_enemies.push(this);
        }

        // Counter for all enemies - shared by all enemies
        Enemy.prototype.total = 0;
        Enemy.prototype.destroyed = 0;

        // Possible values that the enemy can have
        Enemy.prototype.value_array = [2,4,8,16,32,64,128,256,512,1024];

        // Enemy Spawner
        function enemyGenerator()
        {
            // spawn at random times
            var delay = (Math.random() * 450) + (800 / properties.difficulty); 

            enemy_generator = setTimeout(function()
                    {
                    // spawn the enemy
                    var new_enemy = new Enemy();

                    // remove this to prevent leaks
                    clearTimeout( enemy_generator );

                    // call this function again :)
                    enemyGenerator();

                    }, delay);

        }

        function stopEnemyGenerator(){ 
            clearTimeout( enemy_generator );
        }

        function weightedRandom()
        {
            // can be anything
            var level = player.level

                // get the first random number
                // the first number is between 1 and the level divided by two
                var first = Math.floor( Math.random() * ( 5 + Math.floor( level / 2 ) ) ) + 1;
            
            // get the second random number
            var second = Math.random();
            
            // apply weighting, based on the value of the number
            // the higher the number, the lower the probability of it "making it out alive"            
            for( var i = first ; i > 0 ; i-- ) {
                if( second < ( 1 / first ) ){
                    return first;
                } else {
                    // chop down the number to increase the odds of returning the next one
                    first--;
                }
            }
            
            // should we somehow return a perfect 1
            return 1;
        }


        // ------------------------------------------------------------------------------------------------------------
        // Weapons

        function Projectile()
        {
            // values
            this.damage     = 1;

            // positioning
            this.height     = 16;
            this.width      = 16;
            this.y          = player.y - this.height;
            this.x          = player.x + player.width/2; // between left edge + width, and right edge - width
            this.speed      = 8;
            this.direction  = -1; // negative, going up

            this.color = '#f65d3b';

            // on creation, add to the bullets array
            array_of_shots.push(this);

        }


        // ------------------------------------------------------------------------------------------------------------
        // The collision detection system

        function checkHits()
        {
            // loops through entities to check for bounding box hits
            
            var total_enemies = array_of_enemies.length;
            var total_shots = array_of_shots.length;

            // -----------------------------------------------------------------------------
            // Check player shot hits on enemies
            // Check enemies crashing into player

            if( total_enemies > 0 )
            {
                for( var ep = 0 ; ep < total_enemies ; ep++ ) // ep = enemy pointer
                {
                    // get the enemy object
                    var enemy = array_of_enemies[ep];

                    // Check player shot hits on enemies
                    if( total_shots > 0 )
                    {
                        for( var sp = 0 ; sp < total_shots ; sp++ ) // sp = shot pointer
                        {
                            // get the shot object
                            var shot = array_of_shots[sp];

                            // TODO : add a back to the hit detection area > but for speed's sake, it is not needed...
                            if( ((shot.x + shot.width) > enemy.x) && (shot.x <= (enemy.x + enemy.width)) && (shot.y <= (enemy.y + enemy.height - shot.height)) )
                            {
                                // score stuff
                                score += enemy.points;
                                // player.updatePoints( enemy.points );
                                // console.log("score increased! - ", score);

                                // shots
                                array_of_shots.splice( sp , 1 );        // remove the shot 
                                total_shots--;                          // shorten the array
                                sp--;                                   // move the pointer back one shot

                                // enemies
                                array_of_enemies.splice( ep , 1 );      // remove the enemy
                                total_enemies--;                        // shorten the array
                                ep--;                                   // move the pointer back one enemy

                                // some other stuff...
                            }
                        }
                    }

                    // Check enemies hitting player
                    // TODO : code here
                    if(     ((player.x + player.width) > enemy.x) && 
                            (player.x <= (enemy.x + enemy.width)) && 
                            (player.y <= (enemy.y + enemy.height)) && 
                            (player.y + player.height >= (enemy.y + enemy.height - player.height)) 
                            )
                    {
                        console.log("collision!");

                        // check if the point values are the same for the colliding objects
                        if( player.points === enemy.points ){
                            player.addPoints();
                        } else {
                            player.removePoints();
                        }

                        // remove the enemy
                        array_of_enemies.splice( ep , 1 );      // remove the enemy
                        total_enemies--;                        // shorten the array
                        ep--;                                   // move the pointer back one enemy
                    }

                }
            }

            // TODO

            // -----------------------------------------------------------------------------
            // Check enemy shot hits on player

            // -----------------------------------------------------------------------------
            // Check player picking up power ups


        }


        // ------------------------------------------------------------------------------------------------------------
        // renders elements onto the canvas

        function renderElement( element )
        {
            // draw the element
            canvas.fillStyle = element.color;        
            canvas.fillRect(
                element.x,
                element.y,
                element.width,
                element.height
            );
           
            // draw value if needed
            if( element.hasOwnProperty('points') ){
                // switch to white to draw the text 
                canvas.fillStyle = 'white';
                canvas.fillText(element.points, element.x + element.width/2, element.y + element.height/2);
            }

        }

        function renderFrame()
        {
            // reset the canvas to a blank screen
            canvas.clearRect( 0, 0, frame_width, frame_height );

            // render the player
            renderElement(player);

            // update the player's position
            player.updatePosition();

            // render the enemies
            var total_enemies = array_of_enemies.length;
            // console.log("total_enemies" , total_enemies);
            if( total_enemies > 0 )
            { 
                for( var e = 0 ; e < total_enemies ; e++ )
                {
                    var enemy = array_of_enemies[e];
                    
                    // draw the enemy                
                    renderElement(enemy);

                    // update the enemy position
                    enemy.y += enemy.speed;

                    // check if enemy is now off-screen
                    if( enemy.y > frame_height )
                    {
                        // penalize the player
                        score -= enemy.points; // * 2;
                        // player.updatePoints( -enemy.points * 2 );

                        // remove the enemy from the array
                        array_of_enemies.splice( e , 1 );
                        
                        // compensate : array is now one unit shorter
                        total_enemies--; // shorten the array
                        e--; // move back one element
                    }
                }  
            }
    
            // render the shots
            var total_shots = array_of_shots.length;
            if( total_shots > 0 )
            {
                for( var p = 0 ; p < total_shots ; p++ )
                {
                    var shot = array_of_shots[p];
                    
                    // draw the enemy                
                    renderElement(shot);

                    // update the enemy position
                    shot.y -= shot.speed;
                    
                    // check if enemy is now off-screen
                    if( shot.y < 0 ){
                        array_of_shots.splice( p , 1 );
                        // compensate : array is now one unit shorter
                        total_shots--; // shorten the array
                        p--; // move back one element
                    }
                }  
            }

            // check for collisions
            checkHits();

            // display the player score
            document.getElementById('output').innerHTML = 'SCORE: ' + score;

        }

        // ------------------------------------------------------------------------------------------------------------
        // Keyboard Events

        window.onkeydown = function(e) 
        {
            // get the key pressed
            var keyCode = e.keyCode ? e.keyCode : e.which;
            
            /*
                37 - left
                38 - up
                39 - right
                40 - down
            */

            switch( keyCode ){
                case 37: 
                    player.moving_left = true;
                    break;
                case 38: 
                    player.moving_up = true;
                    break;
                case 39: 
                    player.moving_right = true;
                    break;
                case 40: 
                    player.moving_down = true;
                    break;
            }
        }
    
        window.onkeyup = function(e) 
        {
            var keyCode = e.keyCode ? e.keyCode : e.which;

            switch( keyCode ){
                case 32: 
                    player.shoot();
                    break;
                case 37: 
                    player.moving_left = false;
                    break;
                case 38: 
                    player.moving_up = false;
                    break;
                case 39: 
                    player.moving_right = false;
                    break;
                case 40: 
                    player.moving_down = false;
                    break;
            }
        }
        
        window.onkeypress = function(e)
        {
            var keyCode = e.keyCode ? e.keyCode : e.which;
            switch( keyCode ){
                case 112:
                    pauseGame();
                    break;
            }
        }


        // ------------------------------------------------------------------------------------------------------------
        // set up the game properties
        function setup()
        {
            console.log('setup called');

            // check for options
            if( typeof user_options !== 'undefined' )
            {
                console.log('we detected options: ' , user_options);
                // override the default properties with user-set ones (if they exist)
                for( var option in user_options ){
                    if( typeof option !== 'undefined' ){
                        properties[option] = user_options[option];
                    }
                };
            }

            // set text/font options
            canvas.textAlign = "center";
            canvas.textBaseline = "middle";
            canvas.font = "bold 24px sans-serif";

    
            // add the player to the screen
            player = new Player(); // use the "global" player var to store the player

            // let's get this show on the road!
            startGame();

            // run one frame of the game loop, then pause for the user to get acquainted
            gameLoop();
            pauseGame();

        }

        function startGame(){
            animateInterval = setInterval( gameLoop , properties.refresh_rate );
            enemyGenerator();
        }
        function stopGame(){
            clearInterval( animateInterval );
            stopEnemyGenerator();
        }
        function pauseGame()
        {
            if( game_paused === false ){
                stopGame(); 
                game_paused = true;
                document.getElementById('hud').innerHTML = 'GAME PAUSED. Press "P" to Start';
            } else {
                startGame();
                game_paused = false;
                document.getElementById('hud').innerHTML = '';
            }
        }

        // runs every X milliseconds
        function gameLoop()
        {
            // console.log( "beep!" , properties.difficulty );
            renderFrame();
        }

        // call setup
        setup();

        // return a game object (will be used for additional user interaction like cheat codes)
        return {

            stopGame: function(){
                stopGame();
            },

            // randomly spawn an enemy
            enemy: function(){
                var e = new Enemy();
            }
            
        }

    })();

    // shortcut reference
    game = window.smu48;

}); // window(load)

